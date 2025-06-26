const db = require('./db');

async function testQuery() {
    try {
        console.log('Testing query for categoria "Belleza"...\n');
        
        const categoria = 'Belleza';
        
        const query = `SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio, t.duracion_total,
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
                       AND t.id_turno NOT IN (
                           SELECT ts.id_turno 
                           FROM turno_servicio ts
                           JOIN servicio s ON ts.id_servicio = s.id_servicio
                           GROUP BY ts.id_turno
                           HAVING COUNT(DISTINCT s.categoria) > 1
                       )
                       AND t.id_turno IN (
                           SELECT ts.id_turno 
                           FROM turno_servicio ts
                           JOIN servicio s ON ts.id_servicio = s.id_servicio
                           WHERE s.categoria = ?
                           GROUP BY ts.id_turno
                       )
                       ORDER BY t.fecha, t.hora`;
        
        const [result] = await db.query(query, [categoria]);
        
        console.log('Results:');
        result.forEach(turno => {
            console.log(`- Turno ${turno.id_turno}: ${turno.servicios}`);
        });
        
        console.log('\nDebugging each part...');
        
        // 1. Turnos con múltiples categorías (que deben excluirse)
        const [multiples] = await db.query(`
            SELECT ts.id_turno 
            FROM turno_servicio ts
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            GROUP BY ts.id_turno
            HAVING COUNT(DISTINCT s.categoria) > 1
        `);
        console.log('Turnos con múltiples categorías (a excluir):', multiples.map(t => t.id_turno));
        
        // 2. Turnos que tienen al menos un servicio de la categoría
        const [conCategoria] = await db.query(`
            SELECT ts.id_turno 
            FROM turno_servicio ts
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            WHERE s.categoria = ?
            GROUP BY ts.id_turno
        `, [categoria]);
        console.log('Turnos con servicios de', categoria + ':', conCategoria.map(t => t.id_turno));
        
        // 3. Verificar si turno 42 debería estar
        const [turno42] = await db.query(`
            SELECT ts.id_turno,
                   GROUP_CONCAT(s.categoria) as categorias,
                   COUNT(DISTINCT s.categoria) as num_cat
            FROM turno_servicio ts
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            WHERE ts.id_turno = 42
            GROUP BY ts.id_turno
        `);
        
        if (turno42.length > 0) {
            console.log('Turno 42 tiene:', turno42[0].categorias, '(', turno42[0].num_cat, 'categorías)');
            console.log('¿Debería excluirse?', turno42[0].num_cat > 1 ? 'SÍ' : 'NO');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

testQuery();
