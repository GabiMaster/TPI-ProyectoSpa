const db = require('../db');

async function checkClientes() {
    try {
        const [rows] = await db.query('SELECT id_cliente, nombre, apellido, email FROM cliente LIMIT 5');
        console.log('📋 Clientes existentes:');
        rows.forEach(cliente => {
            console.log(`  ID: ${cliente.id_cliente}, Email: ${cliente.email}, Nombre: ${cliente.nombre} ${cliente.apellido}`);
        });
        
        if (rows.length === 0) {
            console.log('⚠️  No hay clientes registrados');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkClientes();
