const db = require('./db');
const EmpleadoScheduleManager = require('./empleadoScheduleManager');

async function demostracionConflictoReal() {
    try {
        console.log('=== DEMOSTRACIÓN PRÁCTICA DE CONFLICTOS DE HORARIO ===\n');
        
        const empleadoManager = new EmpleadoScheduleManager();
        
        // 1. Obtener fechas con turnos existentes
        console.log('1. Buscando fechas con turnos existentes...');
        const [fechasConTurnos] = await db.query(`
            SELECT DISTINCT t.fecha, COUNT(*) as total_turnos
            FROM turno t
            WHERE t.estado IN ('disponible', 'reservado')
            ORDER BY t.fecha
            LIMIT 5
        `);
        
        if (fechasConTurnos.length === 0) {
            console.log('No hay turnos en la base de datos.');
            return;
        }
        
        console.log('Fechas con turnos:');
        fechasConTurnos.forEach(fecha => {
            console.log(`- ${fecha.fecha}: ${fecha.total_turnos} turnos`);
        });
        
        const fechaDemo = fechasConTurnos[0].fecha;
        
        // 2. Obtener empleados con turnos en esa fecha
        console.log(`\n2. Empleados con turnos el ${fechaDemo}:`);
        const [empleadosEnFecha] = await db.query(`
            SELECT DISTINCT
                e.id_empleado,
                CONCAT(e.nombre, ' ', e.apellido) as nombre_completo,
                COUNT(te.id_turno) as turnos_ese_dia
            FROM empleado e
            JOIN turno_empleado te ON e.id_empleado = te.id_empleado
            JOIN turno t ON te.id_turno = t.id_turno
            WHERE t.fecha = ? AND t.estado IN ('disponible', 'reservado')
            GROUP BY e.id_empleado
            ORDER BY turnos_ese_dia DESC
            LIMIT 3
        `, [fechaDemo]);
        
        if (empleadosEnFecha.length === 0) {
            console.log('No hay empleados asignados en esa fecha.');
            return;
        }
        
        empleadosEnFecha.forEach(emp => {
            console.log(`- ${emp.nombre_completo} (ID: ${emp.id_empleado}) - ${emp.turnos_ese_dia} turnos`);
        });
        
        const empleadoDemo = empleadosEnFecha[0];
        
        // 3. Ver cronograma del empleado
        console.log(`\n3. Cronograma detallado de ${empleadoDemo.nombre_completo} el ${fechaDemo}:`);
        const cronograma = await empleadoManager.obtenerCronograma(empleadoDemo.id_empleado, fechaDemo);
        
        console.log(`Total de turnos: ${cronograma.length}`);
        cronograma.forEach((turno, index) => {
            console.log(`  ${index + 1}. Turno ${turno.id_turno}: ${turno.hora} - ${turno.hora_fin} (${turno.estado})`);
        });
        
        if (cronograma.length < 2) {
            console.log('\nNecesitamos al menos 2 turnos para demostrar conflicto. Creando turnos de prueba...');
            
            // Crear dos turnos solapados para demostración
            const [nuevoTurno1] = await db.query(`
                INSERT INTO turno (fecha, hora, hora_fin, duracion_total, precio_total, estado) 
                VALUES (?, '10:00:00', '11:30:00', 90, 5000, 'disponible')
            `, [fechaDemo]);
            
            const [nuevoTurno2] = await db.query(`
                INSERT INTO turno (fecha, hora, hora_fin, duracion_total, precio_total, estado) 
                VALUES (?, '11:00:00', '12:30:00', 90, 5000, 'disponible')
            `, [fechaDemo]);
            
            // Asignar empleado al primer turno
            await db.query(`
                INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, ?)
            `, [nuevoTurno1.insertId, empleadoDemo.id_empleado]);
            
            console.log(`\n4. CREADOS TURNOS DE DEMOSTRACIÓN:`);
            console.log(`- Turno ${nuevoTurno1.insertId}: 10:00 - 11:30 (ASIGNADO a ${empleadoDemo.nombre_completo})`);
            console.log(`- Turno ${nuevoTurno2.insertId}: 11:00 - 12:30 (DISPONIBLE)`);
            
            // 5. Intentar validar asignación conflictiva
            console.log(`\n5. INTENTANDO ASIGNAR ${empleadoDemo.nombre_completo} AL TURNO CONFLICTIVO:`);
            console.log(`Turno objetivo: ${nuevoTurno2.insertId} (11:00 - 12:30)`);
            console.log(`Empleado ya tiene: Turno ${nuevoTurno1.insertId} (10:00 - 11:30)`);
            console.log(`¿Hay solapamiento? SÍ - de 11:00 a 11:30`);
            
            const validacion = await empleadoManager.validarAsignacion(nuevoTurno2.insertId, [empleadoDemo.id_empleado]);
            
            console.log('\n6. RESULTADO DE LA VALIDACIÓN:');
            console.log(`✅ Válido: ${validacion.valido ? 'SÍ' : 'NO'}`);
            console.log(`📋 Mensaje: ${validacion.mensaje}`);
            
            if (validacion.errores && validacion.errores.length > 0) {
                console.log('🚫 Errores detectados:');
                validacion.errores.forEach(error => {
                    console.log(`   - ${error}`);
                });
            }
            
            if (validacion.empleadosDisponibles) {
                console.log(`👥 Empleados disponibles: ${validacion.empleadosDisponibles.length}`);
            }
            
            if (validacion.empleadosConConflicto) {
                console.log(`⚠️  Empleados con conflicto: ${validacion.empleadosConConflicto.length}`);
                validacion.empleadosConConflicto.forEach(conflicto => {
                    console.log(`   - ${conflicto.nombre}: ${conflicto.mensaje}`);
                });
            }
            
            console.log('\n7. ¿QUÉ PASARÍA EN EL ENDPOINT DE ASIGNACIÓN?');
            if (!validacion.valido) {
                console.log('🚫 RESPUESTA: HTTP 400 Bad Request');
                console.log('📄 CUERPO: {');
                console.log('     "error": "Conflicto de horarios",');
                console.log(`     "detalles": ${JSON.stringify(validacion.errores)}`);
                console.log('   }');
                console.log('✋ LA ASIGNACIÓN SE RECHAZA AUTOMÁTICAMENTE');
            } else {
                console.log('✅ La asignación procedería normalmente');
            }
            
            // Limpiar turnos de prueba
            console.log('\n8. Limpiando turnos de demostración...');
            await db.query('DELETE FROM turno_empleado WHERE id_turno IN (?, ?)', [nuevoTurno1.insertId, nuevoTurno2.insertId]);
            await db.query('DELETE FROM turno WHERE id_turno IN (?, ?)', [nuevoTurno1.insertId, nuevoTurno2.insertId]);
            console.log('✅ Turnos de prueba eliminados');
            
        } else {
            // Si ya hay turnos, usar los existentes para demostrar
            const turno1 = cronograma[0];
            const turno2 = cronograma[1];
            
            console.log(`\n4. COMPARANDO DOS TURNOS EXISTENTES:`);
            console.log(`- Turno A: ${turno1.hora} - ${turno1.hora_fin}`);
            console.log(`- Turno B: ${turno2.hora} - ${turno2.hora_fin}`);
            
            // Verificar si hay solapamiento real
            const hora1Inicio = turno1.hora;
            const hora1Fin = turno1.hora_fin;
            const hora2Inicio = turno2.hora;
            const hora2Fin = turno2.hora_fin;
            
            const haySolapamiento = (hora1Inicio < hora2Fin && hora1Fin > hora2Inicio);
            
            console.log(`¿Hay solapamiento? ${haySolapamiento ? 'SÍ' : 'NO'}`);
            
            if (haySolapamiento) {
                console.log('⚠️  ¡Este empleado tiene turnos solapados en el sistema actual!');
                console.log('   Esto indica que ya hay conflictos que deberían ser resueltos.');
            }
        }
        
    } catch (error) {
        console.error('Error en demostración:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

demostracionConflictoReal();
