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

async function debugClientEndpoints() {
    console.log('🔍 Debugging endpoints de cliente...');
    
    try {
        // 1. Login de cliente
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
            email: 'cliente@test.com',
            password: 'test123'
        });
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        
        if (loginResponse.statusCode !== 200) {
            console.log('❌ Login falló');
            return;
        }
        
        const loginResult = JSON.parse(loginResponse.body);
        const token = loginResult.token;
        
        console.log('✅ Login exitoso');
        console.log('🔑 Token obtenido:', token ? 'SÍ' : 'NO');
        console.log('👤 User data:', JSON.stringify(loginResult.user, null, 2));
        
        // 2. Probar todas las rutas posibles
        const routes = [
            '/api/clientes/perfil',
            '/api/clientes/profile',
            '/api/cliente/perfil',
            '/api/client/perfil'
        ];
        
        for (const route of routes) {
            console.log(`\n🧪 Probando: ${route}`);
            
            const testOptions = {
                hostname: 'localhost',
                port: 3000,
                path: route,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            const testResponse = await makeRequest(testOptions);
            console.log(`📊 Status: ${testResponse.statusCode}`);
            
            if (testResponse.statusCode === 200) {
                console.log(`✅ FUNCIONA: ${route}`);
                console.log('📄 Response:', testResponse.body);
                break;
            } else {
                console.log(`❌ Error: ${testResponse.body}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
    }
}

debugClientEndpoints();
