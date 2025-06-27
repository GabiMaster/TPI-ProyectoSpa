const db = require('./db');

(async () => {
    try {
        console.log('🔍 Verificando turnos del 29 de junio...');
        
        const [turnos29] = await db.query(`
            SELECT fecha, hora, estado, id_turno
            FROM turno 
            WHERE DATE(fecha) = '2025-06-29'
            LIMIT 5
        `);
        
        console.log('📊 Turnos del 29/6/2025:', turnos29);
        
        console.log('\n🔍 Verificando todos los turnos...');
        const [allTurnos] = await db.query(`
            SELECT DATE(fecha) as fecha_solo, COUNT(*) as count
            FROM turno 
            GROUP BY DATE(fecha)
            ORDER BY DATE(fecha)
        `);
        
        console.log('📊 Resumen por fecha:');
        allTurnos.forEach(t => {
            console.log(`  ${t.fecha_solo}: ${t.count} turnos`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
