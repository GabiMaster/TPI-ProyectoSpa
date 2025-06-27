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

async function verificarTurnosAtendidos() {
    try {
        console.log('Verificando turnos con estado "atendido"...\n');
        
        // Obtener turnos atendidos
        const [rows] = await promisePool.execute(
            'SELECT id, estado, fecha, hora, cliente_id FROM turnos WHERE estado = ? ORDER BY fecha DESC, hora DESC LIMIT 10', 
            ['atendido']
        );
        
        console.log('Turnos con estado "atendido":');
        console.table(rows);
        
        // Obtener resumen de todos los estados
        const [estados] = await promisePool.execute(
            'SELECT DISTINCT estado, COUNT(*) as count FROM turnos GROUP BY estado'
        );
        
        console.log('\nResumen de estados:');
        console.table(estados);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

verificarTurnosAtendidos();
