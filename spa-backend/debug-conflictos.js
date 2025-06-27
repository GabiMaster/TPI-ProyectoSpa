const db = require('./db');

async function crearTurnoConflictivo() {
  try {
    console.log('=== CREANDO TURNO CONFLICTIVO PARA PRUEBA ===');
    
    // Obtener datos del turno 75 para crear conflicto
    const [turno75] = await db.query(`
      SELECT t.*, te.id_empleado
      FROM turno t
      JOIN turno_empleado te ON t.id_turno = te.id_turno
      WHERE t.id_turno = 75
    `);
    
    if (turno75.length === 0) {
      console.log('❌ Turno 75 no encontrado');
      process.exit(1);
    }
    
    const turno = turno75[0];
    console.log('📋 Datos del turno 75:');
    console.log(`- Fecha: ${turno.fecha}`);
    console.log(`- Hora: ${turno.hora} - ${turno.hora_fin}`);
    console.log(`- Empleado ID: ${turno.id_empleado}`);
    console.log(`- Estado: ${turno.estado}`);
    
    // Obtener servicios del turno 75
    const [servicios] = await db.query(`
      SELECT ts.id_servicio, s.nombre
      FROM turno_servicio ts
      JOIN servicio s ON ts.id_servicio = s.id_servicio
      WHERE ts.id_turno = 75
    `);
    
    console.log('🔧 Servicios del turno 75:');
    servicios.forEach(s => console.log(`- ${s.nombre} (ID: ${s.id_servicio})`));
    
    // Preparar datos para API
    const datosApi = {
      servicios: servicios.map(s => s.id_servicio),
      empleados: [turno.id_empleado],
      fecha: turno.fecha.toISOString().split('T')[0], // Formato YYYY-MM-DD
      hora_inicio: '15:45:00', // Conflicto con turno 75 (14:30-16:00)
      hora_fin: '16:30:00',
      precio: 25.00,
      duracion_total: 45
    };
    
    console.log('\n🚀 Datos para enviar a la API:');
    console.log(JSON.stringify(datosApi, null, 2));
    
    // Hacer la petición a la API
    const fetch = (await import('node-fetch')).default;
    
    console.log('\n📤 Enviando petición POST a /api/admin/turnos...');
    
    try {
      const response = await fetch('http://localhost:3000/api/admin/turnos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Primero probamos sin autenticación para ver si llega al endpoint
        },
        body: JSON.stringify(datosApi)
      });
      
      const responseText = await response.text();
      
      console.log(`\n📥 Respuesta HTTP ${response.status}:`);
      console.log(responseText);
    } catch (fetchError) {
      console.error('❌ Error en petición HTTP:', fetchError.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

crearTurnoConflictivo();
