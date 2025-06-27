const db = require('../db');

async function checkClients() {
    try {
        console.log('=== CLIENTES DISPONIBLES ===');
        const [clientes] = await db.query('SELECT id_cliente, nombre, email FROM cliente LIMIT 5');
        clientes.forEach(cliente => {
            console.log(`ID: ${cliente.id_cliente}, Nombre: ${cliente.nombre}, Email: ${cliente.email}`);
        });
        
        if (clientes.length > 0) {
            const clienteId = clientes[0].id_cliente;
            console.log(`\n=== PROBANDO RESERVA DIRECTA PARA CLIENTE ${clienteId} ===`);
            
            // Buscar un turno disponible para el 30/06/2025
            const [turnos] = await db.query(`
                SELECT id_turno, fecha, hora, precio_total 
                FROM turno 
                WHERE estado = 'disponible' 
                AND fecha = '2025-06-30'
                LIMIT 1
            `);
            
            if (turnos.length === 0) {
                console.log('❌ No hay turnos disponibles para el 30/06/2025');
                return;
            }
            
            const turno = turnos[0];
            console.log('Turno encontrado:', turno);
            
            // Actualizar directamente con método débito y descuento
            const precioOriginal = parseFloat(turno.precio_total);
            const descuentoAplicado = precioOriginal * 0.15;
            const precioFinal = precioOriginal - descuentoAplicado;
            
            await db.query(`
                UPDATE turno 
                SET id_cliente = ?, 
                    estado = 'reservado', 
                    metodo_pago = 'debito',
                    precio_original = ?,
                    descuento_aplicado = ?,
                    precio_final = ?,
                    fecha_reserva = NOW()
                WHERE id_turno = ?
            `, [clienteId, precioOriginal, descuentoAplicado, precioFinal, turno.id_turno]);
            
            console.log('✅ Turno reservado con débito y descuento');
            console.log(`Precio original: $${precioOriginal}`);
            console.log(`Descuento aplicado: $${descuentoAplicado}`);
            console.log(`Precio final: $${precioFinal}`);
            
            // Verificar el resultado
            const [turnoActualizado] = await db.query(`
                SELECT id_turno, metodo_pago, precio_original, descuento_aplicado, precio_final, estado
                FROM turno 
                WHERE id_turno = ?
            `, [turno.id_turno]);
            
            console.log('\n=== TURNO ACTUALIZADO ===');
            console.log(turnoActualizado[0]);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkClients();
