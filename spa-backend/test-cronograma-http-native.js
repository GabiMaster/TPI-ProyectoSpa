const http = require('http');

// Función para hacer una petición HTTP simple
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testHistorialEndpoint() {
    try {
        console.log('=== Testing historial endpoint ===\n');
        
        // 1. Login para obtener token
        console.log('1. Obteniendo token de admin...');
        const loginData = JSON.stringify({
            email: 'admin@spa.com',
            password: 'admin123'
        });
        
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        if (loginResponse.status !== 200) {
            throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`);
        }
        
        const token = loginResponse.data.token;
        console.log('Token obtenido exitosamente\n');
        
        // 2. Obtener historial completo
        console.log('2. Obteniendo historial completo...');
        const historialOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/turnos/historial-completo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const historialResponse = await makeRequest(historialOptions);
        console.log(`Status: ${historialResponse.status}`);
        console.log(`Total turnos: ${historialResponse.data.length}`);
        
        const estados = [...new Set(historialResponse.data.map(t => t.estado))];
        console.log('Estados encontrados:', estados);
        
        const turnosAtendidos = historialResponse.data.filter(t => t.estado === 'atendido');
        console.log(`Turnos atendidos: ${turnosAtendidos.length}`);
        
        if (turnosAtendidos.length > 0) {
            console.log('Detalles de turnos atendidos:');
            turnosAtendidos.forEach(t => {
                console.log(`- ID: ${t.id_turno}, Estado: ${t.estado}, Fecha: ${t.fecha}, Cliente: ${t.cliente_nombre} ${t.cliente_apellido}`);
            });
        }
        
        // 3. Obtener historial filtrado por "atendido"
        console.log('\n3. Obteniendo historial filtrado por "atendido"...');
        const filtradoOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/turnos/historial-completo?estado=atendido',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const filtradoResponse = await makeRequest(filtradoOptions);
        console.log(`Status: ${filtradoResponse.status}`);
        console.log(`Turnos filtrados: ${filtradoResponse.data.length}`);
        
        if (filtradoResponse.data.length > 0) {
            console.log('Detalles de turnos filtrados:');
            filtradoResponse.data.forEach(t => {
                console.log(`- ID: ${t.id_turno}, Estado: ${t.estado}, Fecha: ${t.fecha}, Cliente: ${t.cliente_nombre} ${t.cliente_apellido}`);
            });
        } else {
            console.log('❌ No se encontraron turnos con el filtro "atendido"');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testHistorialEndpoint();
