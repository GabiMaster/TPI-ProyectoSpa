const db = require('./db');

async function unifyTurnoPrices() {
    try {
        console.log('🔍 Verificando el estado actual de las columnas de precio en la tabla turno...');
        
        // Obtener estructura de la tabla
        const [structure] = await db.query('DESCRIBE turno');
        console.log('\n📊 Estructura de la tabla turno:');
        structure.forEach(col => {
            if (col.Field.includes('precio')) {
                console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'Nullable' : 'Not Null'})`);
            }
        });
        
        // Verificar datos existentes
        const [turnos] = await db.query(`
            SELECT id_turno, precio, precio_total, 
                   CASE 
                       WHEN precio IS NULL AND precio_total IS NULL THEN 'Ambos NULL'
                       WHEN precio IS NULL THEN 'Solo precio_total'
                       WHEN precio_total IS NULL THEN 'Solo precio'
                       WHEN precio = precio_total THEN 'Iguales'
                       ELSE 'Diferentes'
                   END as estado_precios
            FROM turno 
            ORDER BY id_turno 
            LIMIT 10
        `);
        
        console.log('\n📋 Muestra de datos actuales:');
        turnos.forEach(turno => {
            console.log(`  Turno ${turno.id_turno}: precio=${turno.precio}, precio_total=${turno.precio_total} (${turno.estado_precios})`);
        });
        
        // Estadísticas generales
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_turnos,
                COUNT(precio) as con_precio,
                COUNT(precio_total) as con_precio_total,
                COUNT(CASE WHEN precio IS NOT NULL AND precio_total IS NOT NULL THEN 1 END) as ambos_campos,
                COUNT(CASE WHEN precio IS NULL AND precio_total IS NULL THEN 1 END) as sin_precio
            FROM turno
        `);
        
        console.log('\n📈 Estadísticas:');
        const stat = stats[0];
        console.log(`  - Total de turnos: ${stat.total_turnos}`);
        console.log(`  - Turnos con 'precio': ${stat.con_precio}`);
        console.log(`  - Turnos con 'precio_total': ${stat.con_precio_total}`);
        console.log(`  - Turnos con ambos campos: ${stat.ambos_campos}`);
        console.log(`  - Turnos sin precio: ${stat.sin_precio}`);
        
        // Verificar si hay discrepancias
        const [discrepancias] = await db.query(`
            SELECT COUNT(*) as discrepancias
            FROM turno 
            WHERE precio IS NOT NULL 
              AND precio_total IS NOT NULL 
              AND precio != precio_total
        `);
        
        if (discrepancias[0].discrepancias > 0) {
            console.log(`\n⚠️  Encontradas ${discrepancias[0].discrepancias} discrepancias entre precio y precio_total`);
            
            const [ejemplos] = await db.query(`
                SELECT id_turno, precio, precio_total
                FROM turno 
                WHERE precio IS NOT NULL 
                  AND precio_total IS NOT NULL 
                  AND precio != precio_total
                LIMIT 5
            `);
            
            console.log('   Ejemplos:');
            ejemplos.forEach(ej => {
                console.log(`     Turno ${ej.id_turno}: precio=${ej.precio}, precio_total=${ej.precio_total}`);
            });
        }
        
        console.log('\n✅ Análisis completado');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

unifyTurnoPrices();
