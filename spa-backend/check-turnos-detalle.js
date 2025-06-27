const mysql = require('mysql2');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'spa_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

async function verificarTurnosDetalle() {
    try {
        console.log('Verificando turnos con estado "atendido" en detalle...\n');
        
        // Verificar turnos atendidos con los nombres correctos de columnas
        const [turnos] = await promisePool.execute(
            `SELECT id_turno, estado, fecha, hora, id_cliente, precio_total, fecha_reserva, fecha_modificacion 
             FROM turno 
             WHERE estado = ? 
             ORDER BY fecha DESC, hora DESC LIMIT 10`, 
            ['atendido']
        );
        
        console.log('Turnos con estado "atendido":');
        console.table(turnos);
        
        // También verificar todos los turnos no disponibles para contexto
        const [turnosNoDisponibles] = await promisePool.execute(
            `SELECT id_turno, estado, fecha, hora, id_cliente, precio_total, fecha_reserva, fecha_modificacion 
             FROM turno 
             WHERE estado != 'disponible' 
             ORDER BY fecha_modificacion DESC LIMIT 10`
        );
        
        console.log('\nTodos los turnos no disponibles (últimos 10):');
        console.table(turnosNoDisponibles);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

verificarTurnosDetalle();
