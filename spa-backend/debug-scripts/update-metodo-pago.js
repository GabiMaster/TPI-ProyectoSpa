const db = require('../db');

async function updateMetodoPago() {
    try {
        console.log('Actualizando enum metodo_pago para incluir debito...');
        
        const alterQuery = `
            ALTER TABLE turno 
            MODIFY COLUMN metodo_pago ENUM('efectivo', 'transferencia', 'debito') NOT NULL
        `;
        
        await db.query(alterQuery);
        console.log('✅ Tabla turno actualizada con método de pago "debito"');
        
        // Verificar la actualización
        const [columns] = await db.query('DESCRIBE turno');
        const metodoPagoColumn = columns.find(col => col.Field === 'metodo_pago');
        console.log('Nuevo tipo de columna metodo_pago:', metodoPagoColumn.Type);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

updateMetodoPago();
