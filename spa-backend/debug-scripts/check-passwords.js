const db = require('./db');

async function verificarPasswordsAdmins() {
  try {
    const [admins] = await db.query('SELECT id_admin, nombre, email, contraseña FROM administrador');
    
    console.log('=== VERIFICANDO CONTRASEÑAS DE ADMINISTRADORES ===');
    admins.forEach(admin => {
      console.log(`ID: ${admin.id_admin}, Nombre: ${admin.nombre}, Email: ${admin.email}`);
      console.log(`Contraseña: ${admin.contraseña ? 'EXISTE' : 'ES NULL/UNDEFINED'}`);
      if (admin.contraseña) {
        console.log(`Longitud hash: ${admin.contraseña.length} caracteres`);
        console.log(`Empieza con $2: ${admin.contraseña.startsWith('$2') ? 'SÍ' : 'NO'}`);
      }
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verificarPasswordsAdmins();
