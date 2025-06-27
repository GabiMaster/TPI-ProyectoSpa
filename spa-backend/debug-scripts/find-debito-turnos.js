const db = require('../db');

async function findDebitoTurnos() {
    try {
        console.log('=== BUSCANDO TURNOS CON DÉBITO ===');
        
        const [turnos] = await db.query(`
            SELECT id_turno, fecha, hora, metodo_pago, precio_original, descuento_aplicado, precio_final
            FROM turno 
            WHERE metodo_pago = 'debito'
            ORDER BY id_turno DESC
            LIMIT 10
        `);
        
        console.log('Turnos con método débito encontrados:', turnos.length);
        turnos.forEach(turno => {
            console.log(`ID: ${turno.id_turno}, Fecha: ${turno.fecha}, Método: ${turno.metodo_pago}, Original: ${turno.precio_original}, Descuento: ${turno.descuento_aplicado}, Final: ${turno.precio_final}`);
        });
        
        console.log('\n=== ÚLTIMOS 5 TURNOS CREADOS ===');
        const [recent] = await db.query(`
            SELECT id_turno, fecha, hora, metodo_pago, precio_original, descuento_aplicado, precio_final, fecha_reserva
            FROM turno 
            ORDER BY id_turno DESC
            LIMIT 5
        `);
        
        recent.forEach(turno => {
            console.log(`ID: ${turno.id_turno}, Fecha: ${turno.fecha}, Método: ${turno.metodo_pago}, Original: ${turno.precio_original}, Descuento: ${turno.descuento_aplicado}, Final: ${turno.precio_final}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

findDebitoTurnos();
