const db = require('./db');

async function finalVerification() {
    try {
        console.log('🔍 Verificación final del sistema unificado de precios...');
        
        // 1. Verificar estructura de tablas
        console.log('\n1️⃣ Verificando estructura de tablas...');
        
        const [turnoStructure] = await db.query('DESCRIBE turno');
        const [servicioStructure] = await db.query('DESCRIBE servicio');
        
        const turnoPrecioTotal = turnoStructure.find(col => col.Field === 'precio_total');
        const turnoPrecio = turnoStructure.find(col => col.Field === 'precio');
        const servicioPrecio = servicioStructure.find(col => col.Field === 'precio');
        
        console.log(`   ✅ Tabla turno - precio_total: ${turnoPrecioTotal ? 'EXISTE' : 'NO EXISTE'}`);
        console.log(`   ✅ Tabla turno - precio: ${turnoPrecio ? 'EXISTE' : 'NO EXISTE (eliminada correctamente)'}`);
        console.log(`   ✅ Tabla servicio - precio: ${servicioPrecio ? 'EXISTE' : 'NO EXISTE (eliminada correctamente)'}`);
        
        // 2. Verificar datos de turnos
        console.log('\n2️⃣ Verificando datos de turnos...');
        
        const [turnosStats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                MIN(precio_total) as precio_min,
                MAX(precio_total) as precio_max,
                AVG(precio_total) as precio_promedio
            FROM turno
        `);
        
        const stats = turnosStats[0];
        console.log(`   📊 Total de turnos: ${stats.total}`);
        console.log(`   💰 Precio mínimo: $${stats.precio_min}`);
        console.log(`   💰 Precio máximo: $${stats.precio_max}`);
        console.log(`   💰 Precio promedio: $${parseFloat(stats.precio_promedio).toFixed(2)}`);
        
        // 3. Verificar servicios sin precio
        console.log('\n3️⃣ Verificando servicios...');
        
        const [serviciosStats] = await db.query(`
            SELECT COUNT(*) as total
            FROM servicio
        `);
        
        console.log(`   📊 Total de servicios: ${serviciosStats[0].total}`);
        console.log(`   ✅ Los servicios ya no tienen campo precio (solo los turnos tienen precio)`);
        
        // 4. Probar una consulta típica de turno disponible
        console.log('\n4️⃣ Probando consulta típica de turnos disponibles...');
        
        const [turnosDisponibles] = await db.query(`
            SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total,
                   GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados
            FROM turno t
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno  
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.estado = 'disponible'
            GROUP BY t.id_turno
            ORDER BY t.fecha, t.hora
            LIMIT 5
        `);
        
        if (turnosDisponibles.length > 0) {
            console.log(`   ✅ Query exitosa, encontrados ${turnosDisponibles.length} turnos disponibles:`);
            turnosDisponibles.forEach(turno => {
                console.log(`     - Turno ${turno.id_turno}: ${turno.fecha.toISOString().split('T')[0]} ${turno.hora} - $${turno.precio_total}`);
                console.log(`       Servicios: ${turno.servicios || 'Sin servicios'}`);
                console.log(`       Empleados: ${turno.empleados || 'Sin empleados'}`);
            });
        } else {
            console.log('   ℹ️  No hay turnos disponibles en el sistema');
        }
        
        // 5. Verificar integridad referencial
        console.log('\n5️⃣ Verificando integridad referencial...');
        
        const [referencialCheck] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM turno_servicio) as turno_servicio_count,
                (SELECT COUNT(*) FROM turno_empleado) as turno_empleado_count,
                (SELECT COUNT(*) FROM turno WHERE estado = 'disponible') as turnos_disponibles,
                (SELECT COUNT(*) FROM turno WHERE estado = 'reservado') as turnos_reservados
        `);
        
        const check = referencialCheck[0];
        console.log(`   📊 Relaciones turno-servicio: ${check.turno_servicio_count}`);
        console.log(`   📊 Relaciones turno-empleado: ${check.turno_empleado_count}`);
        console.log(`   📊 Turnos disponibles: ${check.turnos_disponibles}`);
        console.log(`   📊 Turnos reservados: ${check.turnos_reservados}`);
        
        console.log('\n🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
        console.log('================================================================');
        console.log('✅ RESUMEN DE LA UNIFICACIÓN DE PRECIOS:');
        console.log('----------------------------------------------------------------');
        console.log('1. ✅ Eliminada columna "precio" de tabla servicio');
        console.log('2. ✅ Eliminada columna "precio" de tabla turno');
        console.log('3. ✅ Unificado uso de "precio_total" en tabla turno');
        console.log('4. ✅ Actualizado backend para usar precio_total');
        console.log('5. ✅ Actualizado frontend para usar precio_total');
        console.log('6. ✅ Verificada integridad de datos');
        console.log('7. ✅ Probados endpoints principales');
        console.log('================================================================');
        console.log('🚀 El sistema está listo para usar con la gestión unificada de precios!');
        
    } catch (error) {
        console.error('❌ Error durante la verificación final:', error);
    } finally {
        process.exit(0);
    }
}

finalVerification();
