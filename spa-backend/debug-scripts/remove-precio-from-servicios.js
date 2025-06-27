const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function removePrecioColumn() {
    let connection;
    
    try {
        // Crear conexión
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('🔗 Conectado a la base de datos');

        // Verificar si la columna existe
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'servicio' AND COLUMN_NAME = 'precio'
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('✅ La columna "precio" ya no existe en la tabla servicio');
            return;
        }

        console.log('🔍 Columna "precio" encontrada en la tabla servicio');

        // Eliminar la columna precio
        await connection.query('ALTER TABLE servicio DROP COLUMN precio');
        
        console.log('✅ Columna "precio" eliminada exitosamente de la tabla servicio');
        console.log('📋 Ahora los servicios solo tendrán: id_servicio, nombre, descripcion, duracion, categoria');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔐 Conexión cerrada');
        }
    }
}

// Ejecutar script si se llama directamente
if (require.main === module) {
    removePrecioColumn();
}

module.exports = removePrecioColumn;
