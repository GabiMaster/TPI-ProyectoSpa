const db = require('./db');

async function checkClientes() {
    console.log('👥 Verificando clientes en la base de datos...');
    
    try {
        const [clientes] = await db.query('SELECT id_cliente, nombre, apellido, email FROM cliente LIMIT 5');
        console.log('🧑‍💼 Clientes encontrados:', clientes.length);
        
        if (clientes.length > 0) {
            console.log('📋 Lista de clientes:');
            clientes.forEach(cliente => {
                console.log(`  - ${cliente.nombre} ${cliente.apellido} (${cliente.email}) - ID: ${cliente.id_cliente}`);
            });
        } else {
            console.log('❌ No hay clientes en la base de datos');
            console.log('💡 Sugerencia: Registra un cliente desde la página de registro');
        }
        
    } catch (error) {
        console.error('❌ Error verificando clientes:', error);
    }
    
    process.exit(0);
}

checkClientes();
