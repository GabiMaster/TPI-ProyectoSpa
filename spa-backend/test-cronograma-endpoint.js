const db = require('./db');

async function testCronogramaEndpoint() {
    console.log('🧪 Probando endpoint de cronograma...');
    
    try {
        // Primero obtener empleados disponibles
        const [empleados] = await db.query('SELECT id_empleado, nombre, apellido FROM empleado LIMIT 5');
        console.log('👥 Empleados encontrados:', empleados.length);
        
        if (empleados.length === 0) {
            console.log('❌ No hay empleados en la base de datos');
            return;
        }
        
        // Probar con el primer empleado
        const empleado = empleados[0];
        const fecha = '2024-12-20'; // Fecha de ejemplo
        
        console.log(`📅 Probando cronograma para ${empleado.nombre} ${empleado.apellido} (ID: ${empleado.id_empleado}) en fecha: ${fecha}`);
        
        // Consulta similar a la del endpoint
        const query = `
            SELECT 
                t.id_turno,
                t.fecha,
                TIME_FORMAT(t.hora, '%H:%i') as hora_inicio,
                TIME_FORMAT(t.hora_fin, '%H:%i') as hora_fin,
                t.estado,
                t.precio_total,
                t.duracion_total,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                GROUP_CONCAT(DISTINCT s.nombre ORDER BY s.nombre SEPARATOR ', ') as servicios,
                GROUP_CONCAT(DISTINCT CONCAT(e2.nombre, ' ', e2.apellido) ORDER BY e2.nombre SEPARATOR ', ') as otros_empleados
            FROM turno t
            LEFT JOIN cliente c ON t.id_cliente = c.id_cliente
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e2 ON te.id_empleado = e2.id_empleado AND e2.id_empleado != ?
            WHERE t.id_turno IN (
                SELECT DISTINCT te2.id_turno 
                FROM turno_empleado te2 
                WHERE te2.id_empleado = ?
            )
            AND t.fecha = ?
            GROUP BY t.id_turno, t.fecha, t.hora, t.hora_fin, t.estado, t.precio_total, t.duracion_total, c.nombre, c.apellido, c.telefono, c.email
            ORDER BY t.hora
        `;
        
        const [turnos] = await db.query(query, [empleado.id_empleado, empleado.id_empleado, fecha]);
        
        console.log(`✅ Turnos encontrados para ${fecha}:`, turnos.length);
        
        if (turnos.length > 0) {
            console.log('📋 Detalles de turnos:');
            turnos.forEach((turno, index) => {
                console.log(`  ${index + 1}. ${turno.hora_inicio}-${turno.hora_fin} | ${turno.servicios || 'Sin servicios'} | Cliente: ${turno.cliente_nombre ? `${turno.cliente_nombre} ${turno.cliente_apellido}` : 'Sin cliente'} | Estado: ${turno.estado}`);
            });
        }
        
        // Probar con diferentes fechas para encontrar datos
        console.log('\n🔍 Buscando turnos en diferentes fechas...');
        const [turnosGenerales] = await db.query(`
            SELECT DISTINCT t.fecha, COUNT(*) as cantidad
            FROM turno t
            JOIN turno_empleado te ON t.id_turno = te.id_turno
            WHERE te.id_empleado = ?
            GROUP BY t.fecha
            ORDER BY t.fecha DESC
            LIMIT 5
        `, [empleado.id_empleado]);
        
        console.log('📅 Fechas con turnos para este empleado:');
        turnosGenerales.forEach(fecha => {
            console.log(`  - ${fecha.fecha}: ${fecha.cantidad} turno(s)`);
        });
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
    
    process.exit(0);
}

testCronogramaEndpoint();
