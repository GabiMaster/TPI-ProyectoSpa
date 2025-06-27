const http = require('http');

// Verificar si el servidor está corriendo
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log('✅ Servidor está corriendo en puerto 3000');
    console.log(`Status: ${res.statusCode}`);
});

req.on('error', (error) => {
    console.log('❌ Servidor NO está corriendo en puerto 3000');
    console.log('Error:', error.code);
    console.log('\nPara iniciar el servidor:');
    console.log('cd spa-backend');
    console.log('node index.js');
});

req.end();

setTimeout(() => {
    process.exit(0);
}, 2000);
