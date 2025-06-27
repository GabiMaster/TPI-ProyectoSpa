const db = require('./db');

async function verificarTurno() {
    try {
        const [rows] = await db.query('SELECT * FROM turno WHERE id_turno = 550');
        console.log('Turno creado:', JSON.stringify(rows[0], null, 2));
        
        // Verificar cálculo de 48h
        const turno = rows[0];
        const fechaStr = turno.fecha.toISOString().split('T')[0]; // Solo YYYY-MM-DD
        const fechaHoraTurno = new Date(`${fechaStr}T${turno.hora}`);
        const ahora = new Date();
        const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);
        
        console.log('Fecha str:', fechaStr);
        console.log('Hora:', turno.hora);
        console.log('Fecha/Hora turno:', fechaHoraTurno);
        console.log('Ahora:', ahora);
        console.log('Diferencia horas:', diffHoras);
        console.log('Puede cancelar:', diffHoras >= 48);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

verificarTurno();
