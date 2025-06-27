const axios = require('axios');

// Función para hacer login y obtener token
async function loginAsTestClient() {
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'cliente@test.com', // Ajusta según tu cliente de prueba
            contraseña: 'test123'
        });
        return response.data.token;
    } catch (error) {
        console.error('Error en login:', error.response?.data || error.message);
        return null;
    }
}

// Función para probar el endpoint de tarjetas
async function testTarjetaEndpoint() {
    const token = await loginAsTestClient();
    if (!token) {
        console.log('❌ No se pudo obtener token');
        return;
    }

    console.log('✅ Token obtenido:', token.substring(0, 20) + '...');

    // Decodificar token para obtener ID
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('👤 Cliente ID:', payload.id);

    try {
        // Probar GET tarjeta
        console.log('\n🔍 Probando GET /api/clientes/' + payload.id + '/tarjeta');
        const response = await axios.get(`http://localhost:3000/api/clientes/${payload.id}/tarjeta`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Respuesta GET:', response.data);
    } catch (error) {
        console.error('❌ Error GET:', error.response?.data || error.message);
    }

    try {
        // Probar POST tarjeta
        console.log('\n📝 Probando POST /api/clientes/' + payload.id + '/tarjeta');
        const postResponse = await axios.post(`http://localhost:3000/api/clientes/${payload.id}/tarjeta`, {
            numero_tarjeta: '1234567890123456',
            titular: 'JUAN PEREZ',
            vencimiento: '12/25',
            dni_titular: '12345678'
        }, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Respuesta POST:', postResponse.data);
    } catch (error) {
        console.error('❌ Error POST:', error.response?.data || error.message);
    }
}

// Ejecutar test
testTarjetaEndpoint().catch(console.error);
