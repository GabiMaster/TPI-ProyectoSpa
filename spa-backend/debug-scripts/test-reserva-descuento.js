const axios = require('axios');

async function testReservaConDescuento() {
    try {
        console.log('🧪 PROBANDO RESERVA CON DESCUENTO');
        console.log('===============================');
        
        // Simular datos de reserva como los que envía el frontend
        const datosReserva = {
            turno: {
                id_turno: 553,
                precioOriginal: 110,
                descuentoAplicado: 16.5, // 15% de 110
                precioTotal: 93.5, // 110 - 16.5
                metodoPago: 'debito'
            }
        };
        
        console.log('📤 Enviando datos de reserva:');
        console.log(JSON.stringify(datosReserva, null, 2));
        
        // Hacer la petición al endpoint de reservas
        // Nota: Necesitaremos un token válido para esto
        console.log('\n⚠️ Para probar completamente necesitamos:');
        console.log('1. Un token de cliente válido');
        console.log('2. El servidor backend corriendo');
        console.log('3. La base de datos accesible');
        
        console.log('\n🔍 VERIFICANDO QUE EL TURNO 553 EXISTE:');
        // Hacer una petición GET simple para ver turnos disponibles
        try {
            const response = await axios.get('http://localhost:3000/api/turnos/disponibles');
            const turno553 = response.data.find(t => t.id_turno === 553);
            
            if (turno553) {
                console.log('✅ Turno 553 encontrado:');
                console.log(`   Precio: $${turno553.precio_total}`);
                console.log(`   Servicios: ${turno553.servicios}`);
                console.log(`   Fecha: ${turno553.fecha}`);
                console.log(`   Hora: ${turno553.hora}`);
            } else {
                console.log('❌ Turno 553 no encontrado en turnos disponibles');
            }
        } catch (error) {
            console.log('❌ Error al verificar turnos disponibles:', error.message);
            console.log('   Posibles causas:');
            console.log('   - Servidor backend no está corriendo en puerto 3000');
            console.log('   - Base de datos no accesible');
            console.log('   - Turno 553 no existe o no está disponible');
        }
        
        console.log('\n💡 RECOMENDACIONES:');
        console.log('1. Verificar que el servidor backend esté corriendo');
        console.log('2. Verificar que la base de datos tenga las columnas necesarias');
        console.log('3. Crear un cliente de prueba y obtener su token');
        console.log('4. Probar la reserva desde el frontend');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

testReservaConDescuento();
