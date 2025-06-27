const db = require('./db');

async function testDatabaseDirectly() {
    try {
        console.log('🧪 Probando acceso directo a la base de datos...');
        
        // Test 1: Verificar que precio_total existe y tiene datos
        const [results] = await db.query(`
            SELECT id_turno, precio_total, duracion_total, estado
            FROM turno 
            WHERE estado = 'disponible' 
            LIMIT 5
        `);
        
        console.log('✅ Resultados de la consulta:');
        results.forEach(turno => {
            console.log(`   Turno ${turno.id_turno}: $${turno.precio_total} (${turno.duracion_total} min) - ${turno.estado}`);
        });
        
        // Test 2: Probar la misma query que usa el endpoint
        console.log('\n🔍 Probando query del endpoint disponibles/facial...');
        
        const [facialTurnos] = await db.query(`
            SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total,
                   (SELECT GROUP_CONCAT(DISTINCT s2.nombre SEPARATOR ', ') 
                    FROM turno_servicio ts2 
                    JOIN servicio s2 ON ts2.id_servicio = s2.id_servicio 
                    WHERE ts2.id_turno = t.id_turno) AS servicios,
                   (SELECT GROUP_CONCAT(DISTINCT CONCAT(e2.nombre, ' ', e2.apellido) SEPARATOR ', ') 
                    FROM turno_empleado te2 
                    JOIN empleado e2 ON te2.id_empleado = e2.id_empleado 
                    WHERE te2.id_turno = t.id_turno) AS empleados
            FROM turno t
            WHERE t.estado = 'disponible'
            AND t.id_turno IN (
                SELECT ts.id_turno 
                FROM turno_servicio ts
                JOIN servicio s ON ts.id_servicio = s.id_servicio
                WHERE s.categoria = ?
                GROUP BY ts.id_turno
                HAVING COUNT(DISTINCT s.categoria) = 1
            )
            ORDER BY t.fecha, t.hora
            LIMIT 3
        `, ['facial']);
        
        if (facialTurnos.length > 0) {
            console.log('✅ Turnos faciales encontrados:');
            facialTurnos.forEach(turno => {
                console.log(`   Turno ${turno.id_turno}: $${turno.precio_total} (${turno.duracion_total} min)`);
                console.log(`     Servicios: ${turno.servicios}`);
                console.log(`     Empleados: ${turno.empleados}`);
            });
        } else {
            console.log('ℹ️  No se encontraron turnos faciales disponibles');
        }
        
        console.log('\n✅ Test completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante el test:', error);
    } finally {
        process.exit(0);
    }
}

testDatabaseDirectly();
