async function testCrearTurnoConflictivo() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // Paso 1: Hacer login para obtener token válido
    console.log('🔐 Haciendo login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'martinezgabriel7007@gmail.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.error('❌ Error en login:', loginData);
      return;
    }
    
    console.log('✅ Login exitoso, obteniendo token...');
    const token = loginData.token;
    
    // Paso 2: Crear turno conflictivo
    const datosApi = {
      servicios: [7], // Lifting de pestaña
      empleados: [7], // Eladio
      fecha: "2025-07-03",
      hora_inicio: "15:45:00", // Conflicto con turno 75 (14:30-16:00)
      hora_fin: "16:30:00",
      precio: 25.00,
      duracion_total: 45
    };
    
    console.log('\n🚀 Creando turno conflictivo...');
    console.log('Datos:', JSON.stringify(datosApi, null, 2));
    
    const response = await fetch('http://localhost:3000/api/admin/turnos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datosApi)
    });
    
    const responseText = await response.text();
    
    console.log(`\n📥 Respuesta HTTP ${response.status}:`);
    console.log(responseText);
    
    if (response.status === 400 || responseText.includes('conflicto')) {
      console.log('\n✅ ¡VALIDACIÓN FUNCIONANDO! El turno conflictivo fue rechazado.');
    } else if (response.status === 201 || response.status === 200) {
      console.log('\n❌ PROBLEMA: El turno conflictivo fue aceptado cuando debería ser rechazado.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCrearTurnoConflictivo();
