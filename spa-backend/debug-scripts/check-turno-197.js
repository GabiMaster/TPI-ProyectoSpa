const db = require('../db');

async function checkTurno197() {
    try {
        const querySQL = `
            SELECT 
                id_turno, fecha, hora, precio_original, descuento_aplicado, precio_final, 
                metodo_pago, fecha_reserva,
                TIMESTAMPDIFF(HOUR, NOW(), CONCAT(fecha, ' ', hora)) as horas_hasta_turno
            FROM turno 
            WHERE id_turno = 197
        `;
        
        const [rows] = await db.query(querySQL);
        
        if (rows.length === 0) {
            console.log('No se encontró el turno 197');
            return;
        }
        
        const turno = rows[0];
        console.log('=== TURNO 197 ===');
        console.log('ID:', turno.id_turno);
        console.log('Fecha:', turno.fecha);
        console.log('Hora:', turno.hora);
        console.log('Precio Original:', turno.precio_original);
        console.log('Descuento Aplicado:', turno.descuento_aplicado);
        console.log('Precio Final:', turno.precio_final);
        console.log('Método de Pago:', turno.metodo_pago);
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
        console.log('¿Debería tener descuento?', horasHastaReserva > 48 && turno.metodo_pago === 'debito');
        
        if (horasHastaReserva > 48 && turno.metodo_pago === 'debito') {
            const descuentoEsperado = turno.precio_original * 0.15;
            const precioFinalEsperado = turno.precio_original - descuentoEsperado;
            console.log('\nDescuento esperado:', descuentoEsperado);
            console.log('Precio final esperado:', precioFinalEsperado);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkTurno197();
