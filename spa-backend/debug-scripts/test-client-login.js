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

async function testClientLogin() {
    console.log('🧪 Probando login de cliente y endpoints...');
    
    try {
        // 1. Obtener un cliente existente para probar
        console.log('📝 Paso 1: Verificando clientes existentes...');
        
        // Primero login como admin para verificar datos
        const adminLoginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const adminLoginData = JSON.stringify({
            email: 'martinezgabriel7007@gmail.com',
            password: 'admin123'
        });
        
        const adminLoginResponse = await makeRequest(adminLoginOptions, adminLoginData);
        if (adminLoginResponse.statusCode !== 200) {
            console.log('❌ No se pudo hacer login como admin');
            return;
        }
        
        console.log('✅ Login admin exitoso');
        
        // 2. Probar login de cliente (necesitamos un cliente de prueba)
        console.log('📝 Paso 2: Probando login de cliente...');
        
        const clientLoginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        // Usar un cliente de prueba (deberías usar credenciales reales)
        const clientLoginData = JSON.stringify({
            email: 'cliente@test.com',
            password: 'test123'
        });
        
        const clientLoginResponse = await makeRequest(clientLoginOptions, clientLoginData);
        
        if (clientLoginResponse.statusCode === 200) {
            console.log('✅ Login de cliente exitoso');
            const clientResult = JSON.parse(clientLoginResponse.body);
            const token = clientResult.token;
            
            // 3. Probar endpoint de perfil de cliente
            console.log('📝 Paso 3: Probando endpoint de perfil...');
            
            const perfilOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/clientes/perfil',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
            
            const perfilResponse = await makeRequest(perfilOptions);
            console.log('📊 Perfil Status:', perfilResponse.statusCode);
            
            if (perfilResponse.statusCode === 200) {
                console.log('✅ Endpoint de perfil funciona');
            }
            
            // 4. Probar endpoint de historial
            console.log('📝 Paso 4: Probando endpoint de historial...');
            
            const historialOptions = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/turnos/historial',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
            
            const historialResponse = await makeRequest(historialOptions);
            console.log('📊 Historial Status:', historialResponse.statusCode);
            
            if (historialResponse.statusCode === 200) {
                console.log('✅ Endpoint de historial funciona');
                const historialData = JSON.parse(historialResponse.body);
                console.log('📈 Turnos encontrados:', historialData.length);
            } else {
                console.log('❌ Error en historial:', historialResponse.body);
            }
            
        } else {
            console.log('❌ Login de cliente falló');
            console.log('Response:', clientLoginResponse.body);
            console.log('📝 Nota: Necesitas crear un cliente de prueba o usar credenciales existentes');
        }
        
    } catch (error) {
        console.error('❌ Error en el test:', error);
    }
}

testClientLogin();
