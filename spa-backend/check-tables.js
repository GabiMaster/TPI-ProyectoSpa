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

async function verificarTablas() {
    try {
        console.log('Verificando tablas en la base de datos...\n');
        
        // Obtener todas las tablas
        const [tables] = await promisePool.execute('SHOW TABLES');
        
        console.log('Tablas disponibles:');
        console.table(tables);
        
        // Si existe la tabla turno (singular), verificar su estructura
        const tableName = tables.find(t => Object.values(t)[0].toLowerCase().includes('turno'));
        if (tableName) {
            const turnoTableName = Object.values(tableName)[0];
            console.log(`\nEstructura de la tabla ${turnoTableName}:`);
            
            const [columns] = await promisePool.execute(`DESCRIBE ${turnoTableName}`);
            console.table(columns);
            
            // Verificar estados
            const [estados] = await promisePool.execute(
                `SELECT DISTINCT estado, COUNT(*) as count FROM ${turnoTableName} GROUP BY estado`
            );
            
            console.log('\nResumen de estados:');
            console.table(estados);
            
            // Verificar turnos atendidos
            const [turnos] = await promisePool.execute(
                `SELECT id, estado, fecha, hora, cliente_id FROM ${turnoTableName} WHERE estado = ? ORDER BY fecha DESC, hora DESC LIMIT 5`, 
                ['atendido']
            );
            
            console.log('\nTurnos con estado "atendido":');
            console.table(turnos);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

verificarTablas();
