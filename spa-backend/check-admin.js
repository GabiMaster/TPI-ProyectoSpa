const db = require('./db');

async function verificarAdmins() {
  try {
    const [admins] = await db.query('SELECT id_admin, nombre, email FROM administrador');
    
    console.log('=== ADMINISTRADORES EN LA BASE DE DATOS ===');
    if (admins.length === 0) {
      console.log('❌ No hay administradores registrados');
      
      // Crear un admin temporal
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const [result] = await db.query(
        'INSERT INTO administrador (nombre, apellido, email, telefono, contraseña) VALUES (?, ?, ?, ?, ?)',
        ['Admin', 'Test', 'admin@test.com', '123456789', hashedPassword]
      );
      
      console.log('✅ Admin temporal creado:');
      console.log('Email: admin@test.com');
      console.log('Password: admin123');
      console.log(`ID: ${result.insertId}`);
    } else {
      console.log('✅ Administradores encontrados:');
      admins.forEach(admin => {
        console.log(`- ${admin.nombre} (${admin.email}) - ID: ${admin.id_admin}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verificarAdmins();
