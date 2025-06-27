const mysql = require('mysql2/promise');

async function checkTurno553() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'spa_database'
    });

    try {
        console.log('=== VERIFICANDO TURNO 553 ===');
        
        // Verificar el turno en detalle
        const [turno] = await connection.execute(
            'SELECT * FROM turnos WHERE id = ?',
            [553]
        );
        
        if (turno.length > 0) {
            console.log('\n📅 DATOS DEL TURNO:');
            console.log('ID:', turno[0].id);
            console.log('Cliente ID:', turno[0].cliente_id);
            console.log('Servicio ID:', turno[0].servicio_id);
            console.log('Fecha:', turno[0].fecha);
            console.log('Hora:', turno[0].hora);
            console.log('Estado:', turno[0].estado);
            console.log('Método de pago:', turno[0].metodo_pago);
            console.log('Precio original:', turno[0].precio_original);
            console.log('Descuento aplicado:', turno[0].descuento_aplicado);
            console.log('Precio final:', turno[0].precio_final);
            console.log('Fecha creación:', turno[0].fecha_creacion);
            
            // Verificar el servicio asociado
            console.log('\n💼 DATOS DEL SERVICIO:');
            const [servicio] = await connection.execute(
                'SELECT * FROM servicios WHERE id = ?',
                [turno[0].servicio_id]
            );
            
            if (servicio.length > 0) {
                console.log('Nombre:', servicio[0].nombre);
                console.log('Precio:', servicio[0].precio);
                console.log('Duración:', servicio[0].duracion);
            }
            
            // Verificar si hay historial de reservas
            console.log('\n📊 HISTORIAL DE RESERVAS:');
            const [historial] = await connection.execute(
                'SELECT * FROM historial_reservas WHERE turno_id = ?',
                [553]
            );
            
            if (historial.length > 0) {
                console.log('Encontradas', historial.length, 'entradas en historial:');
                historial.forEach((h, index) => {
                    console.log(`\nEntrada ${index + 1}:`);
                    console.log('  Turno ID:', h.turno_id);
                    console.log('  Cliente ID:', h.cliente_id);
                    console.log('  Acción:', h.accion);
                    console.log('  Precio:', h.precio);
                    console.log('  Método pago:', h.metodo_pago);
                    console.log('  Fecha:', h.fecha);
                });
            } else {
                console.log('No se encontraron entradas en historial_reservas');
            }
            
            // Calcular anticipación
            const fechaTurno = new Date(`${turno[0].fecha}T${turno[0].hora}`);
            const fechaCreacion = new Date(turno[0].fecha_creacion);
            const horasAnticipacion = (fechaTurno - fechaCreacion) / (1000 * 60 * 60);
            
            console.log('\n⏰ CÁLCULO DE ANTICIPACIÓN:');
            console.log('Fecha del turno:', fechaTurno.toLocaleString());
            console.log('Fecha de creación:', fechaCreacion.toLocaleString());
            console.log('Horas de anticipación:', horasAnticipacion.toFixed(2));
            console.log('¿Más de 48h?', horasAnticipacion > 48 ? 'SÍ' : 'NO');
            
            // Verificar si debería aplicar descuento
            const precioServicio = servicio[0]?.precio || 0;
            const deberiaAplicarDescuento = horasAnticipacion > 48 && turno[0].metodo_pago === 'debito';
            const descuentoEsperado = deberiaAplicarDescuento ? precioServicio * 0.15 : 0;
            const precioFinalEsperado = precioServicio - descuentoEsperado;
            
            console.log('\n💰 ANÁLISIS DE DESCUENTO:');
            console.log('Precio del servicio:', precioServicio);
            console.log('¿Debería aplicar descuento?', deberiaAplicarDescuento ? 'SÍ' : 'NO');
            console.log('Descuento esperado:', descuentoEsperado);
            console.log('Precio final esperado:', precioFinalEsperado);
            console.log('Descuento actual en BD:', turno[0].descuento_aplicado || 0);
            console.log('Precio final actual en BD:', turno[0].precio_final || 0);
            
        } else {
            console.log('No se encontró el turno 553');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkTurno553();
