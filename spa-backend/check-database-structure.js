const db = require('./db');

async function checkDatabaseStructure() {
    try {
        console.log('📋 Verificando estructura de la base de datos...\n');
        
        // Mostrar todas las tablas
        const [tables] = await db.query('SHOW TABLES');
        console.log('🗂️ Tablas disponibles:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        console.log('');
        
        // Mostrar estructura de tabla servicio
        console.log('🔍 Estructura de tabla SERVICIO:');
        const [servicioStructure] = await db.query('DESCRIBE servicio');
        servicioStructure.forEach(column => {
            console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
        });
        console.log('');
        
        // Mostrar estructura de tabla turno
        console.log('🔍 Estructura de tabla TURNO:');
        const [turnoStructure] = await db.query('DESCRIBE turno');
        turnoStructure.forEach(column => {
            console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
        });
        console.log('');
        
        // Buscar si hay alguna tabla de precios
        const tablesToCheck = ['precio', 'servicio_precio', 'precios'];
        for (const tableName of tablesToCheck) {
            try {
                const [exists] = await db.query(`SHOW TABLES LIKE '${tableName}'`);
                if (exists.length > 0) {
                    console.log(`🔍 Estructura de tabla ${tableName.toUpperCase()}:`);
                    const [structure] = await db.query(`DESCRIBE ${tableName}`);
                    structure.forEach(column => {
                        console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
                    });
                    console.log('');
                }
            } catch (e) {
                // Tabla no existe, continuar
            }
        }
        
        // Verificar si hay datos de ejemplo en servicio
        console.log('📊 Algunos servicios de ejemplo:');
        const [servicios] = await db.query('SELECT * FROM servicio LIMIT 3');
        servicios.forEach(servicio => {
            console.log(`   ID: ${servicio.id_servicio}, Nombre: ${servicio.nombre}, Duración: ${servicio.duracion}`);
        });
        
    } catch (error) {
        console.error('❌ Error al verificar la estructura:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabaseStructure();
