const fetch = require('node-fetch');

async function testCronogramaHTTP() {
    console.log('🌐 Probando endpoint HTTP de cronograma...');
    
    try {
        // Probar empleado ID 5 en fecha 2025-07-06 (donde sabemos que hay datos)
        const empleadoId = 5;
        const fecha = '2025-07-06';
        
        console.log(`📅 Probando cronograma para empleado ${empleadoId} en fecha: ${fecha}`);
        
        // Primero necesitamos un token válido - vamos a simular el login
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ No se pudo hacer login con credenciales de administrador');
            console.log('Respuesta:', loginResponse.status, await loginResponse.text());
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.token;
        
        console.log('✅ Login exitoso, token obtenido');
        
        // Ahora probar el endpoint de cronograma
        const cronogramaResponse = await fetch(`http://localhost:3000/api/turnos/cronograma/${empleadoId}/${fecha}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!cronogramaResponse.ok) {
            console.log('❌ Error en endpoint de cronograma');
            console.log('Status:', cronogramaResponse.status);
            console.log('Response:', await cronogramaResponse.text());
            return;
        }
        
        const cronogramaData = await cronogramaResponse.json();
        
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
