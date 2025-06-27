const db = require('../db');

async function checkTurnoStructure() {
    try {
        const [results] = await db.query('DESCRIBE turno');
        console.log('Turno table structure:');
        console.table(results);
        
        // Check if precio_total column exists
        const hasPrecioTotal = results.some(column => column.Field === 'precio_total');
        const hasPrecio = results.some(column => column.Field === 'precio');
        
        console.log('\nColumn analysis:');
        console.log('Has precio column:', hasPrecio);
        console.log('Has precio_total column:', hasPrecioTotal);
        
        if (hasPrecioTotal && hasPrecio) {
            console.log('\nBoth precio and precio_total columns exist. We should remove precio_total if it\'s redundant.');
            
            // Check some sample data to see if both columns have the same values
            const [sampleData] = await db.query('SELECT id_turno, precio, precio_total FROM turno LIMIT 5');
            console.log('\nSample data comparison:');
            console.table(sampleData);
        }
        
    } catch (error) {
        console.error('Error checking turno structure:', error);
    } finally {
        // Pool will automatically close connections
        process.exit(0);
    }
}

checkTurnoStructure();
