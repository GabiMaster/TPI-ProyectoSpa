const db = require('./db');

async function verificarTurnos() {
    try {
        console.log('🔍 Verificando turnos en la base de datos...\n');
        
        // Contar total de turnos
        const [total] = await db.query('SELECT COUNT(*) as total FROM turno');
        console.log(`📊 Total de turnos: ${total[0].total}`);
        
        // Mostrar algunos turnos de ejemplo
        const [turnos] = await db.query(`
            SELECT id_turno, fecha, hora, hora_fin, estado, precio_total 
            FROM turno 
            ORDER BY id_turno DESC 
            LIMIT 5
        `);
        
        console.log('\n🎯 Últimos 5 turnos:');
        turnos.forEach(turno => {
            console.log(`   ID: ${turno.id_turno}, Fecha: ${turno.fecha}, Hora: ${turno.hora}-${turno.hora_fin}, Estado: ${turno.estado}, Precio: $${turno.precio_total}`);
        });
        
        // Contar por estado
        const [estados] = await db.query(`
            SELECT estado, COUNT(*) as cantidad 
            FROM turno 
            GROUP BY estado
        `);
        
        console.log('\n📈 Turnos por estado:');
        estados.forEach(estado => {
            console.log(`   ${estado.estado}: ${estado.cantidad}`);
        });
        
    } catch (error) {
        console.error('❌ Error al verificar turnos:', error);
    } finally {
        process.exit(0);
    }
}

verificarTurnos();
