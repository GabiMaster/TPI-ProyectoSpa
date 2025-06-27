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

async function testExactFrontendFlow() {
    console.log('🔍 Probando flujo exacto del frontend...');
    
    try {
        // 1. Login como administrador
        console.log('📝 Paso 1: Login...');
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
            console.log('Response:', loginResponse.body);
            return;
        }
        
        const loginResult = JSON.parse(loginResponse.body);
        const token = loginResult.token;
        console.log('✅ Login exitoso');
        
        // 2. Probar cronograma con empleado 5 y fecha actual
        console.log('📅 Paso 2: Cargando cronograma...');
        const empleadoId = 5;
        const fecha = '2025-07-06';
        
        const cronogramaOptions = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/turnos/cronograma/${empleadoId}/${fecha}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        console.log('🔗 URL completa:', `http://localhost:3000${cronogramaOptions.path}`);
        console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
        
        const cronogramaResponse = await makeRequest(cronogramaOptions);
        
        console.log('📊 Status Code:', cronogramaResponse.statusCode);
        console.log('📋 Response Body:', cronogramaResponse.body);
        
        if (cronogramaResponse.statusCode === 200) {
            console.log('✅ ÉXITO: Endpoint funciona correctamente');
            const data = JSON.parse(cronogramaResponse.body);
            console.log('📈 Turnos encontrados:', data.turnos.length);
        } else {
            console.log('❌ ERROR: Endpoint no funciona');
        }
        
        // 3. Probar diferentes URLs que podrían ser problemáticas
        console.log('🧪 Paso 3: Probando variaciones de URL...');
        
        const urls = [
            `/api/turnos/cronograma/${empleadoId}/${fecha}`,
            `/api/admin/turnos/cronograma/${empleadoId}/${fecha}`,
            `/turnos/cronograma/${empleadoId}/${fecha}`,
            `/api/turnos/cronograma/5/2025-07-06`
        ];
        
        for (const url of urls) {
            const testOptions = {
                hostname: 'localhost',
                port: 3000,
                path: url,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            try {
                const testResponse = await makeRequest(testOptions);
                console.log(`${url} -> Status: ${testResponse.statusCode}`);
            } catch (error) {
                console.log(`${url} -> Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en el test:', error);
    }
}

testExactFrontendFlow();
