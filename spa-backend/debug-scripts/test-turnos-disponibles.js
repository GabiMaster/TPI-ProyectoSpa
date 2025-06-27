const http = require('http');

// Función para hacer una petición HTTP
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function testEndpoints() {
    console.log('🧪 Probando endpoints de turnos disponibles...\n');

    try {
        // Probar endpoint de todos los turnos
        console.log('1. Probando /api/turnos/disponibles (todos los turnos)');
        const allTurnos = await makeRequest('/api/turnos/disponibles');
        console.log(`   Status: ${allTurnos.status}`);
        console.log(`   Cantidad de turnos: ${Array.isArray(allTurnos.data) ? allTurnos.data.length : 'No es array'}`);
        if (Array.isArray(allTurnos.data) && allTurnos.data.length > 0) {
            console.log(`   Primer turno:`, allTurnos.data[0]);
        }
        console.log('');

        // Probar endpoint por categoría
        console.log('2. Probando /api/turnos/disponibles/Belleza');
        const bellezaTurnos = await makeRequest('/api/turnos/disponibles/Belleza');
        console.log(`   Status: ${bellezaTurnos.status}`);
        console.log(`   Cantidad de turnos: ${Array.isArray(bellezaTurnos.data) ? bellezaTurnos.data.length : 'No es array'}`);
        if (Array.isArray(bellezaTurnos.data) && bellezaTurnos.data.length > 0) {
            console.log(`   Primer turno:`, bellezaTurnos.data[0]);
        }
        console.log('');

        console.log('✅ Pruebas completadas');

    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    }
}

testEndpoints();
