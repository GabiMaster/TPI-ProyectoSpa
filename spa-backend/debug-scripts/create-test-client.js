const db = require('./db');
const bcrypt = require('bcryptjs');

async function createTestClient() {
    console.log('👤 Creando cliente de prueba...');
    
    try {
        const email = 'cliente@test.com';
        const password = 'test123';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Verificar si ya existe
        const [existing] = await db.query('SELECT email FROM cliente WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            console.log('✅ Cliente de prueba ya existe');
        } else {
            // Crear cliente de prueba
            const [result] = await db.query(
                'INSERT INTO cliente (nombre, apellido, email, telefono, contraseña) VALUES (?, ?, ?, ?, ?)',
                ['Cliente', 'Prueba', email, '123456789', hashedPassword]
            );
            
            console.log('✅ Cliente de prueba creado exitosamente');
            console.log('📧 Email:', email);
            console.log('🔑 Password:', password);
            console.log('🆔 ID:', result.insertId);
        }
        
    } catch (error) {
        console.error('❌ Error creando cliente de prueba:', error);
    }
    
    process.exit(0);
}

createTestClient();
