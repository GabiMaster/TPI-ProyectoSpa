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
                    body: data
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

async function testVerificarEmpleados() {
    console.log('🧪 Probando endpoint verificar-empleados...');
    
    try {
        // Login
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
            console.log('❌ Login falló');
            return;
        }
        
        const loginResult = JSON.parse(loginResponse.body);
        const token = loginResult.token;
        console.log('✅ Login exitoso');
        
        // Probar verificar empleados
        const verificarOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/turnos/verificar-empleados',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const verificarData = JSON.stringify({
            empleadosIds: [5, 6, 7],
            fecha: '2025-07-06',
            horaInicio: '10:00',
            horaFin: '12:00'
        });
        
        const verificarResponse = await makeRequest(verificarOptions, verificarData);
        
        console.log('📊 Status:', verificarResponse.statusCode);
        console.log('📋 Response:', JSON.parse(verificarResponse.body));
        
        if (verificarResponse.statusCode === 200) {
            console.log('✅ Endpoint verificar-empleados funciona correctamente');
        } else {
            console.log('❌ Error en endpoint verificar-empleados');
        }
        
    } catch (error) {
        console.error('❌ Error en test:', error);
    }
}

testVerificarEmpleados();
