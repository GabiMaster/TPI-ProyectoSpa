const db = require('./db');

async function crearTurnosMasivos() {
    try {
        console.log('🏗️ CREANDO TURNOS MASIVOS PARA PRUEBAS...\n');

        // 1. Obtener servicios por categoría
        const [servicios] = await db.query(`
            SELECT id_servicio, nombre, duracion, precio, categoria
            FROM servicio
            ORDER BY categoria, nombre
        `);

        // 2. Obtener empleados disponibles
        const [empleados] = await db.query(`
            SELECT id_empleado, nombre, apellido, puesto
            FROM empleado
            ORDER BY id_empleado
        `);

        console.log(`📋 Servicios disponibles: ${servicios.length}`);
        console.log(`👥 Empleados disponibles: ${empleados.length}\n`);

        // 3. Configuración de turnos
        const fechas = [
            '2025-06-30', // Lunes
            '2025-07-01', // Martes  
            '2025-07-02', // Miércoles
            '2025-07-03', // Jueves
            '2025-07-04', // Viernes
            '2025-07-05', // Sábado
            '2025-07-06'  // Domingo
        ];

        const horarios = [
            { inicio: '08:00:00', fin: '09:30:00' },
            { inicio: '09:30:00', fin: '11:00:00' },
            { inicio: '11:00:00', fin: '12:30:00' },
            { inicio: '13:00:00', fin: '14:30:00' },
            { inicio: '14:30:00', fin: '16:00:00' },
            { inicio: '16:00:00', fin: '17:30:00' },
            { inicio: '17:30:00', fin: '19:00:00' }
        ];

        let turnosCreados = 0;
        let empleadoIndex = 0;

        // 4. Crear turnos para cada categoría
        const categorias = [...new Set(servicios.map(s => s.categoria))];
        
        for (const categoria of categorias) {
            console.log(`📅 Creando turnos para categoría: ${categoria}`);
            
            const serviciosCategoria = servicios.filter(s => s.categoria === categoria);
            
            for (const fecha of fechas) {
                for (const horario of horarios) {
                    // Seleccionar servicio aleatorio de la categoría
                    const servicioRandom = serviciosCategoria[Math.floor(Math.random() * serviciosCategoria.length)];
                    
                    // Rotar empleados para asegurar variedad
                    const empleadoAsignado = empleados[empleadoIndex % empleados.length];
                    empleadoIndex++;

                    try {
                        // Verificar que no existe conflicto de empleado
                        const [conflicto] = await db.query(`
                            SELECT te.id_turno 
                            FROM turno_empleado te
                            JOIN turno t ON te.id_turno = t.id_turno
                            WHERE te.id_empleado = ? 
                            AND t.fecha = ? 
                            AND t.estado IN ('disponible', 'reservado')
                            AND (
                                (t.hora < ? AND t.hora_fin > ?) OR
                                (? < t.hora_fin AND ? > t.hora)
                            )
                        `, [
                            empleadoAsignado.id_empleado, 
                            fecha, 
                            horario.fin, horario.inicio, 
                            horario.inicio, horario.fin
                        ]);

                        // Si hay conflicto, saltar a siguiente empleado
                        if (conflicto.length > 0) {
                            console.log(`⚠️ Conflicto detectado para ${empleadoAsignado.nombre} en ${fecha} ${horario.inicio}`);
                            empleadoIndex++;
                            continue;
                        }

                        // Crear turno
                        const [resultTurno] = await db.query(`
                            INSERT INTO turno (fecha, hora, hora_fin, estado, precio_total, duracion_total)
                            VALUES (?, ?, ?, 'disponible', ?, ?)
                        `, [
                            fecha, 
                            horario.inicio, 
                            horario.fin,
                            servicioRandom.precio,
                            servicioRandom.duracion
                        ]);

                        const turnoId = resultTurno.insertId;

                        // Asignar servicio al turno
                        await db.query(`
                            INSERT INTO turno_servicio (id_turno, id_servicio)
                            VALUES (?, ?)
                        `, [turnoId, servicioRandom.id_servicio]);

                        // Asignar empleado al turno
                        await db.query(`
                            INSERT INTO turno_empleado (id_turno, id_empleado)
                            VALUES (?, ?)
                        `, [turnoId, empleadoAsignado.id_empleado]);

                        turnosCreados++;

                        if (turnosCreados % 10 === 0) {
                            process.stdout.write(`✅ ${turnosCreados} turnos creados...\r`);
                        }

                    } catch (error) {
                        console.error(`❌ Error creando turno para ${fecha} ${horario.inicio}:`, error.message);
                    }
                }
            }
        }

        console.log(`\n🎉 ¡Proceso completado! ${turnosCreados} turnos creados exitosamente.\n`);

        // 5. Mostrar estadísticas
        console.log('📊 ESTADÍSTICAS DE TURNOS CREADOS:');
        
        const [estatsTurnos] = await db.query(`
            SELECT 
                DATE(fecha) as fecha,
                COUNT(*) as cantidad_turnos
            FROM turno 
            WHERE fecha >= '2025-06-30' AND fecha <= '2025-07-06'
            GROUP BY DATE(fecha)
            ORDER BY fecha
        `);

        estatsTurnos.forEach(stat => {
            const dia = new Date(stat.fecha).toLocaleDateString('es-ES', { weekday: 'long' });
            console.log(`  ${stat.fecha} (${dia}): ${stat.cantidad_turnos} turnos`);
        });

        const [estatsCategoria] = await db.query(`
            SELECT 
                s.categoria,
                COUNT(DISTINCT t.id_turno) as cantidad_turnos
            FROM turno t
            JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            WHERE t.fecha >= '2025-06-30' AND t.fecha <= '2025-07-06'
            GROUP BY s.categoria
            ORDER BY cantidad_turnos DESC
        `);

        console.log('\n📋 TURNOS POR CATEGORÍA:');
        estatsCategoria.forEach(stat => {
            console.log(`  ${stat.categoria}: ${stat.cantidad_turnos} turnos`);
        });

        // 6. Mostrar ejemplo con Eladio Carrión
        const [turnosEladio] = await db.query(`
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora,
                t.hora_fin,
                s.nombre as servicio,
                s.categoria
            FROM turno t
            JOIN turno_empleado te ON t.id_turno = te.id_turno
            JOIN empleado e ON te.id_empleado = e.id_empleado
            JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            WHERE e.nombre = 'Eladio' AND e.apellido = 'Carrión'
            AND t.fecha >= '2025-06-30' AND t.fecha <= '2025-07-06'
            ORDER BY t.fecha, t.hora
            LIMIT 10
        `);

        console.log('\n👨‍💼 EJEMPLO: TURNOS DE ELADIO CARRIÓN (primeros 10):');
        turnosEladio.forEach(turno => {
            console.log(`  🕐 ${turno.fecha.toISOString().split('T')[0]} ${turno.hora}-${turno.hora_fin} | ${turno.servicio} (${turno.categoria})`);
        });

        console.log('\n✨ ¡Listo para probar el sistema de validación de empleados!');
        console.log('💡 Ahora puedes:');
        console.log('   1. Ver el cronograma de Eladio Carrión');
        console.log('   2. Intentar asignar empleados en horarios ocupados');
        console.log('   3. Probar la validación de disponibilidad');

    } catch (error) {
        console.error('❌ Error general:', error);
    } finally {
        process.exit(0);
    }
}

crearTurnosMasivos();
