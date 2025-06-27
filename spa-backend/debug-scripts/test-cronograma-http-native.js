const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data,
                    headers: res.headers
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testCronogramaHTTP() {
    console.log('🌐 Probando endpoint HTTP de cronograma...');
    
    try {
        // Probar empleado ID 5 en fecha 2025-07-06 (donde sabemos que hay datos)
        const empleadoId = 5;
        const fecha = '2025-07-06';
        
        console.log(`📅 Probando cronograma para empleado ${empleadoId} en fecha: ${fecha}`);
        
        // Primero necesitamos un token válido - vamos a simular el login
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const loginData = JSON.stringify({
            email: 'martinezgabriel7007@gmail.com',
            password: 'admin123'
        });
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        
        if (loginResponse.statusCode !== 200) {
            console.log('❌ No se pudo hacer login con credenciales de administrador');
            console.log('Status:', loginResponse.statusCode);
            console.log('Response:', loginResponse.body);
            return;
        }
        
        const loginResult = JSON.parse(loginResponse.body);
        const token = loginResult.token;
        
        console.log('✅ Login exitoso, token obtenido');
        
        // Ahora probar el endpoint de cronograma
        const cronogramaOptions = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/turnos/cronograma/${empleadoId}/${fecha}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const cronogramaResponse = await makeRequest(cronogramaOptions);
        
        if (cronogramaResponse.statusCode !== 200) {
            console.log('❌ Error en endpoint de cronograma');
            console.log('Status:', cronogramaResponse.statusCode);
            console.log('Response:', cronogramaResponse.body);
            return;
        }
        
        const cronogramaData = JSON.parse(cronogramaResponse.body);
        
        console.log('✅ Endpoint de cronograma funcionando correctamente');
        console.log('📊 Datos recibidos:');
        console.log('  - Empleado:', cronogramaData.empleado);
        console.log('  - Fecha:', cronogramaData.fecha);
        console.log('  - Turnos encontrados:', cronogramaData.turnos.length);
        
        if (cronogramaData.turnos.length > 0) {
            console.log('📋 Detalles de turnos:');
            cronogramaData.turnos.forEach((turno, index) => {
                console.log(`  ${index + 1}. ${turno.hora_inicio}-${turno.hora_fin} | ${turno.servicios || 'Sin servicios'} | Cliente: ${turno.cliente_nombre ? `${turno.cliente_nombre} ${turno.cliente_apellido}` : 'Sin cliente'} | Estado: ${turno.estado}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba HTTP:', error);
    }
}

testCronogramaHTTP();
