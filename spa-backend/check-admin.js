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

async function verificarAdmin() {
    try {
        console.log('Verificando usuarios administradores...\n');
        
        // Verificar tabla administrador
        const [admins] = await promisePool.execute('SELECT * FROM administrador');
        
        console.log('Administradores encontrados:');
        console.table(admins.map(admin => ({
            id: admin.id_administrador,
            email: admin.email,
            password_hash: admin.password ? '***HASH***' : 'NO PASSWORD'
        })));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

verificarAdmin();
