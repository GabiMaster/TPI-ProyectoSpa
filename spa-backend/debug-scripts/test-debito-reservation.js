const { default: fetch } = await import('node-fetch');

async function testDebitoReservation() {
    try {
        // Primero necesitamos un token de cliente válido
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'cliente@test.com', // Usar email de cliente existente
                password: 'password123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Error en login');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login exitoso');

        // Buscar un turno disponible para el 30/06/2025
        const turnosResponse = await fetch('http://localhost:3000/api/turnos/disponibles');
        const turnos = await turnosResponse.json();
        
        const turnoFuturo = turnos.find(t => {
            const fechaTurno = new Date(t.fecha);
            return fechaTurno.getDate() === 30 && fechaTurno.getMonth() === 5; // Junio = 5
        });

        if (!turnoFuturo) {
            console.log('❌ No se encontró turno para el 30/06/2025');
            return;
        }

        console.log('✅ Turno encontrado:', turnoFuturo.id_turno);

        // Datos de la reserva con débito
        const reservaData = {
            turno: {
                id_turno: turnoFuturo.id_turno,
                fecha: turnoFuturo.fecha,
                hora: turnoFuturo.hora,
                hora_fin: turnoFuturo.hora_fin,
                servicios: turnoFuturo.servicios,
                duracionTotal: turnoFuturo.duracion_total,
                precioTotal: turnoFuturo.precio_total * 0.85, // Precio con descuento
                precioOriginal: turnoFuturo.precio_total, // Precio original
                descuentoAplicado: turnoFuturo.precio_total * 0.15, // 15% de descuento
                metodoPago: 'debito',
                estado: 'pendiente'
            }
        };

        console.log('Enviando reserva con datos:', JSON.stringify(reservaData, null, 2));

        // Hacer la reserva
        const reservaResponse = await fetch('http://localhost:3000/api/turnos/reservas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reservaData)
        });

        if (!reservaResponse.ok) {
            const errorData = await reservaResponse.json();
            throw new Error(`Error en reserva: ${errorData.error}`);
        }

        const reservaResult = await reservaResponse.json();
        console.log('✅ Reserva exitosa:', reservaResult);

        // Verificar que se guardó correctamente
        console.log('Verificando turno en BD...');
        const db = require('./db');
        const [turnoActualizado] = await db.query(
            'SELECT id_turno, metodo_pago, precio_original, descuento_aplicado, precio_final FROM turno WHERE id_turno = ?',
            [turnoFuturo.id_turno]
        );
        
        console.log('Turno actualizado en BD:', turnoActualizado[0]);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

(async () => {
    await testDebitoReservation();
})();
