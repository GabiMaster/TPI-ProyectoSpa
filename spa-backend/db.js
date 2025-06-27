const mysql = require('mysql2');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug de variables de entorno
console.log('🔧 Configuración DB Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NO PASSWORD');
console.log('DB_NAME:', process.env.DB_NAME);

// Crear pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'spa_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Obtener la versión promisificada
const promisePool = pool.promise();

// Función para obtener una conexión del pool
const getConnection = () => {
    return promisePool.getConnection();
};

// Función para ejecutar queries
const query = (sql, params) => {
    return promisePool.execute(sql, params);
};

// Probar conexión inicial
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('   - Conexión con la base de datos perdida');
        } else if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('   - Demasiadas conexiones a la base de datos');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('   - Conexión rechazada por la base de datos');
        }
        return;
    }
    
    console.log('✅ Conexión exitosa a la base de datos');
    console.log(`📊 ID de conexión: ${connection.threadId}`);
    connection.release();
});

// Manejo de errores del pool
pool.on('error', (err) => {
    console.error('❌ Error en el pool de conexiones:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Reconectando...');
    } else {
        throw err;
    }
});

module.exports = {
    pool,
    query,
    getConnection
};
