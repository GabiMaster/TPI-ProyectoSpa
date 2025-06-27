const db = require('../db');

async function checkTurno553() {
    try {
        const querySQL = `
            SELECT 
                id_turno, fecha, hora, precio_total, precio_original, descuento_aplicado, precio_final, 
                metodo_pago, estado, fecha_reserva,
                TIMESTAMPDIFF(HOUR, NOW(), CONCAT(fecha, ' ', hora)) as horas_hasta_turno
            FROM turno 
            WHERE id_turno = 553
        `;
        
        const [rows] = await db.query(querySQL);
        
        if (rows.length === 0) {
            console.log('No se encontró el turno 553');
            return;
        }
        
        const turno = rows[0];
        console.log('=== TURNO 553 ===');
        console.log('ID:', turno.id_turno);
        console.log('Fecha:', turno.fecha);
        console.log('Hora:', turno.hora);
        console.log('Precio Total:', turno.precio_total);
        console.log('Precio Original:', turno.precio_original);
        console.log('Descuento Aplicado:', turno.descuento_aplicado);
        console.log('Precio Final:', turno.precio_final);
        console.log('Método de Pago:', turno.metodo_pago);
        console.log('Estado:', turno.estado);
        console.log('Fecha Reserva:', turno.fecha_reserva);
        console.log('Horas hasta turno:', turno.horas_hasta_turno);
        
        // Verificar si debería tener descuento
        const fechaTurno = new Date(turno.fecha + ' ' + turno.hora);
        const ahora = new Date();
        const horasHastaReserva = (fechaTurno - ahora) / (1000 * 60 * 60);
        
        console.log('\n=== VERIFICACIÓN DESCUENTO ===');
        console.log('Fecha/Hora Turno:', fechaTurno);
        console.log('Ahora:', ahora);
        console.log('Horas hasta reserva (calculado):', horasHastaReserva);
        console.log('Método de pago:', turno.metodo_pago);
        console.log('¿Es débito?', turno.metodo_pago === 'debito');
        console.log('¿Más de 48h?', horasHastaReserva > 48);
        console.log('¿Debería tener descuento?', horasHastaReserva > 48 && turno.metodo_pago === 'debito');
        
        if (horasHastaReserva > 48 && turno.metodo_pago === 'debito') {
            const precioBase = turno.precio_total || 110;
            const descuentoEsperado = precioBase * 0.15;
            const precioFinalEsperado = precioBase - descuentoEsperado;
            console.log('\n=== DESCUENTO ESPERADO ===');
            console.log('Precio base:', precioBase);
            console.log('Descuento esperado (15%):', descuentoEsperado);
            console.log('Precio final esperado:', precioFinalEsperado);
            
            console.log('\n=== VALORES ACTUALES ===');
            console.log('Precio original guardado:', turno.precio_original);
            console.log('Descuento aplicado guardado:', turno.descuento_aplicado);
            console.log('Precio final guardado:', turno.precio_final);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkTurno553();
