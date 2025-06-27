const fetch = require('node-fetch');

async function obtenerTokenAdmin() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('🔐 Intentando hacer login como administrador...');
    
    // Intentar login como admin
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@spa.com',
        password: 'admin123'
      })
    });
    
    const loginResult = await loginResponse.text();
    console.log(`Login Status: ${loginResponse.status}`);
    console.log('Login Response:', loginResult);
    
    if (loginResponse.ok) {
      const data = JSON.parse(loginResult);
      console.log('\n✅ Token obtenido:', data.token);
      return data.token;
    } else {
      console.log('\n❌ Login falló. Intentando con credenciales por defecto...');
      
      // Revisar si existe un admin en la base de datos
      const db = require('./db');
      const [admins] = await db.query('SELECT * FROM administrador LIMIT 1');
      
      if (admins.length > 0) {
        console.log('📋 Admin encontrado:', admins[0].email);
        console.log('Nota: Puede necesitar cambiar la contraseña');
      } else {
        console.log('❌ No hay administradores en la base de datos');
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

obtenerTokenAdmin().then(async (token) => {
  if (token) {
    console.log('\n🚀 Ahora probando crear turno conflictivo...');
    
    const fetch = (await import('node-fetch')).default;
    
    const datosApi = {
      servicios: [7],
      empleados: [7],
      fecha: "2025-07-03",
      hora_inicio: "15:45:00",
      hora_fin: "16:30:00",
      precio: 25.00,
      duracion_total: 45
    };
    
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
  }
  
  process.exit(0);
});
