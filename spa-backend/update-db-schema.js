const db = require('./db');

async function updateDatabaseSchema() {
    try {
        console.log('Iniciando actualización del esquema de base de datos...');

        // Actualizar la tabla turno para incluir los nuevos estados
        await db.query(`
            ALTER TABLE turno 
            MODIFY COLUMN estado ENUM(
                'disponible', 
                'reservado', 
                'atendido', 
                'cancelado', 
                'expirado', 
                'no_realizado'
            ) DEFAULT 'disponible'
        `);
        
        console.log('✅ Tabla turno actualizada con nuevos estados');

        // Agregar campos para tracking de reservas
        await db.query(`
            ALTER TABLE turno 
            ADD COLUMN IF NOT EXISTS id_cliente INT NULL,
            ADD COLUMN IF NOT EXISTS fecha_reserva TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
        
        console.log('✅ Campos de reserva agregados a la tabla turno');

        // Agregar foreign key para cliente
        await db.query(`
            ALTER TABLE turno 
            ADD CONSTRAINT IF NOT EXISTS fk_turno_cliente 
            FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE SET NULL
        `);
        
        console.log('✅ Foreign key agregada para cliente');

        console.log('🎉 Actualización del esquema completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error actualizando el esquema:', error);
        
        // Si hay error con IF NOT EXISTS, intentar sin esa sintaxis
        if (error.message.includes('IF NOT EXISTS')) {
            try {
                console.log('Intentando con sintaxis alternativa...');
                
                // Verificar si las columnas ya existen
                const [columns] = await db.query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'turno' 
                    AND COLUMN_NAME IN ('id_cliente', 'fecha_reserva', 'fecha_modificacion')
                `);
                
                const existingColumns = columns.map(col => col.COLUMN_NAME);
                
                if (!existingColumns.includes('id_cliente')) {
                    await db.query('ALTER TABLE turno ADD COLUMN id_cliente INT NULL');
                    console.log('✅ Columna id_cliente agregada');
                }
                
                if (!existingColumns.includes('fecha_reserva')) {
                    await db.query('ALTER TABLE turno ADD COLUMN fecha_reserva TIMESTAMP NULL');
                    console.log('✅ Columna fecha_reserva agregada');
                }
                
                if (!existingColumns.includes('fecha_modificacion')) {
                    await db.query('ALTER TABLE turno ADD COLUMN fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
                    console.log('✅ Columna fecha_modificacion agregada');
                }
                
                console.log('🎉 Actualización completada con sintaxis alternativa');
                
            } catch (altError) {
                console.error('❌ Error con sintaxis alternativa:', altError);
            }
        }
    }
    
    process.exit(0);
}

updateDatabaseSchema();
