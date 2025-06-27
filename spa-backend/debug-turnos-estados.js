const db = require('./db');

(async () => {
    try {
        console.log('🔍 Verificando turnos por fecha y estado...');
        
        const [turnos] = await db.query(`
            SELECT fecha, estado, COUNT(*) as count 
            FROM turno 
            GROUP BY fecha, estado 
            ORDER BY fecha, estado
        `);
        
        console.log('📊 Turnos por fecha y estado:');
        turnos.forEach(t => {
            const fecha = t.fecha.toISOString().split('T')[0];
            console.log(`  ${fecha}: ${t.estado} (${t.count} turnos)`);
        });
        
        console.log('\n🔍 Verificando turnos disponibles específicamente...');
        const [disponibles] = await db.query(`
            SELECT fecha, COUNT(*) as count 
            FROM turno 
            WHERE estado IN ('disponible', 'reservado', 'pendiente')
            GROUP BY fecha 
            ORDER BY fecha
        `);
        
        console.log('📊 Turnos disponibles por fecha:');
        disponibles.forEach(t => {
            const fecha = t.fecha.toISOString().split('T')[0];
            console.log(`  ${fecha}: ${t.count} turnos`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
