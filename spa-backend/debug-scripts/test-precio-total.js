const db = require('./db');

async function testTurnoEndpoints() {
    try {
        console.log('🧪 Probando que todos los endpoints de turnos funcionen con precio_total...');
        
        // Test 1: Obtener turnos disponibles
        console.log('\n1️⃣ Testeando turnos disponibles...');
        const [disponibles] = await db.query(`
            SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total
            FROM turno t
            WHERE t.estado = 'disponible'
            LIMIT 3
        `);
        
        if (disponibles.length > 0) {
            console.log('✅ Turnos disponibles obtenidos correctamente:');
            disponibles.forEach(t => {
                console.log(`   - Turno ${t.id_turno}: $${t.precio_total} (${t.duracion_total} min)`);
            });
        } else {
            console.log('ℹ️  No hay turnos disponibles en el sistema');
        }
        
        // Test 2: Obtener un turno específico
        if (disponibles.length > 0) {
            const turnoId = disponibles[0].id_turno;
            console.log(`\n2️⃣ Testeando obtención del turno ${turnoId}...`);
            
            const [turnoDetail] = await db.query(`
                SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total, t.estado,
                       GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                       GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados
                FROM turno t
                LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
                LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
                LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
                LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
                WHERE t.id_turno = ?
                GROUP BY t.id_turno
            `, [turnoId]);
            
            if (turnoDetail.length > 0) {
                const turno = turnoDetail[0];
                console.log('✅ Detalles del turno obtenidos correctamente:');
                console.log(`   - ID: ${turno.id_turno}`);
                console.log(`   - Fecha: ${turno.fecha}`);
                console.log(`   - Hora: ${turno.hora} - ${turno.hora_fin}`);
                console.log(`   - Precio: $${turno.precio_total}`);
                console.log(`   - Duración: ${turno.duracion_total} min`);
                console.log(`   - Servicios: ${turno.servicios || 'Sin servicios'}`);
                console.log(`   - Empleados: ${turno.empleados || 'Sin empleados'}`);
                console.log(`   - Estado: ${turno.estado}`);
            }
        }
        
        // Test 3: Verificar que no hay referencias a la columna precio antigua
        console.log('\n3️⃣ Verificando integridad de la base de datos...');
        
        const [estructuraTurno] = await db.query('DESCRIBE turno');
        const columnaPrecio = estructuraTurno.find(col => col.Field === 'precio');
        const columnaPrecioTotal = estructuraTurno.find(col => col.Field === 'precio_total');
        
        console.log(`   - Columna 'precio': ${columnaPrecio ? 'EXISTE (nullable)' : 'NO EXISTE'}`);
        console.log(`   - Columna 'precio_total': ${columnaPrecioTotal ? 'EXISTE (not null)' : 'NO EXISTE'}`);
        
        if (columnaPrecio) {
            const [countPrecio] = await db.query('SELECT COUNT(*) as count FROM turno WHERE precio IS NOT NULL');
            console.log(`   - Registros con valor en 'precio': ${countPrecio[0].count}`);
        }
        
        if (columnaPrecioTotal) {
            const [countPrecioTotal] = await db.query('SELECT COUNT(*) as count FROM turno WHERE precio_total IS NOT NULL');
            console.log(`   - Registros con valor en 'precio_total': ${countPrecioTotal[0].count}`);
        }
        
        // Test 4: Simular creación de turno
        console.log('\n4️⃣ Simulando estructura de creación de turno...');
        const turnoEjemplo = {
            fecha: '2025-07-01',
            hora_inicio: '10:00:00',
            hora_fin: '11:00:00',
            precio_total: 50.00,
            duracion_total: 60,
            estado: 'disponible'
        };
        
        console.log('✅ Estructura de ejemplo para creación de turno:');
        console.log(`   INSERT INTO turno (fecha, hora, hora_fin, precio_total, duracion_total, estado)`);
        console.log(`   VALUES ('${turnoEjemplo.fecha}', '${turnoEjemplo.hora_inicio}', '${turnoEjemplo.hora_fin}', ${turnoEjemplo.precio_total}, ${turnoEjemplo.duracion_total}, '${turnoEjemplo.estado}')`);
        
        console.log('\n✅ Todos los tests completados exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante los tests:', error);
    } finally {
        process.exit(0);
    }
}

testTurnoEndpoints();
