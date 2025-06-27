const db = require('../db');

async function actualizarEsquemaDescuentos() {
    try {
        console.log('🔧 Agregando columnas de descuento a la tabla turno...');
        
        // Verificar si las columnas ya existen
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'spaproject' 
            AND TABLE_NAME = 'turno' 
            AND COLUMN_NAME IN ('precio_original', 'descuento_aplicado', 'precio_final')
        `);
        
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        
        if (!existingColumns.includes('precio_original')) {
            await db.query(`
                ALTER TABLE turno 
                ADD COLUMN precio_original DECIMAL(10,2) DEFAULT NULL COMMENT 'Precio original antes del descuento'
            `);
            console.log('✅ Columna precio_original agregada');
        } else {
            console.log('ℹ️ Columna precio_original ya existe');
        }
        
        if (!existingColumns.includes('descuento_aplicado')) {
            await db.query(`
                ALTER TABLE turno 
                ADD COLUMN descuento_aplicado DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto del descuento aplicado'
            `);
            console.log('✅ Columna descuento_aplicado agregada');
        } else {
            console.log('ℹ️ Columna descuento_aplicado ya existe');
        }
        
        if (!existingColumns.includes('precio_final')) {
            await db.query(`
                ALTER TABLE turno 
                ADD COLUMN precio_final DECIMAL(10,2) DEFAULT NULL COMMENT 'Precio final después del descuento'
            `);
            console.log('✅ Columna precio_final agregada');
        } else {
            console.log('ℹ️ Columna precio_final ya existe');
        }
        
        console.log('🎉 Esquema de descuentos actualizado exitosamente');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error al actualizar esquema:', error);
        process.exit(1);
    }
}

actualizarEsquemaDescuentos();
