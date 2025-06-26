const db = require('./db');

async function debugQuery() {
    try {
        console.log('Verificando datos de turnos...\n');
        
        // Primero verificar turnos con múltiples categorías
        console.log('1. Turnos con múltiples categorías:');
        const [multiples] = await db.query(`
            SELECT ts.id_turno, 
                   GROUP_CONCAT(DISTINCT s.categoria SEPARATOR ', ') AS categorias,
                   COUNT(DISTINCT s.categoria) as num_categorias
            FROM turno_servicio ts
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            GROUP BY ts.id_turno
            HAVING num_categorias > 1
        `);
        
        multiples.forEach(t => {
            console.log(`- Turno ${t.id_turno}: ${t.categorias} (${t.num_categorias} categorías)`);
        });
        
        console.log('\n2. Turnos con solo categoría "Belleza":');
        const [soloBelleza] = await db.query(`
            SELECT ts.id_turno, 
                   GROUP_CONCAT(DISTINCT s.categoria SEPARATOR ', ') AS categorias,
                   COUNT(DISTINCT s.categoria) as num_categorias
            FROM turno_servicio ts
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            WHERE ts.id_turno NOT IN (
                SELECT ts2.id_turno 
                FROM turno_servicio ts2
                JOIN servicio s2 ON ts2.id_servicio = s2.id_servicio
                GROUP BY ts2.id_turno
                HAVING COUNT(DISTINCT s2.categoria) > 1
            )
            AND ts.id_turno IN (
                SELECT ts3.id_turno 
                FROM turno_servicio ts3
                JOIN servicio s3 ON ts3.id_servicio = s3.id_servicio
                WHERE s3.categoria = 'Belleza'
                GROUP BY ts3.id_turno
            )
            GROUP BY ts.id_turno
        `);
        
        soloBelleza.forEach(t => {
            console.log(`- Turno ${t.id_turno}: ${t.categorias} (${t.num_categorias} categorías)`);
        });
        
        console.log('\n3. Todos los turnos y sus servicios:');
        const [todos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora,
                   GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicios,
                   GROUP_CONCAT(DISTINCT s.categoria SEPARATOR ', ') AS categorias,
                   COUNT(DISTINCT s.categoria) as num_categorias
            FROM turno t
            JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            JOIN servicio s ON ts.id_servicio = s.id_servicio
            WHERE t.estado = 'disponible'
            GROUP BY t.id_turno, t.fecha, t.hora
            ORDER BY t.id_turno
        `);
        
        todos.forEach(t => {
            console.log(`- Turno ${t.id_turno} (${t.fecha} ${t.hora}): ${t.servicios}`);
            console.log(`  Categorías: ${t.categorias} (${t.num_categorias})`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

debugQuery();
