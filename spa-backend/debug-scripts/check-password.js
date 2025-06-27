const db = require('../db');
const bcrypt = require('bcryptjs');

async function checkPassword() {
    try {
        const [rows] = await db.query('SELECT id_cliente, email, contraseña FROM cliente WHERE email = ?', ['cliente@test.com']);
        
        if (rows.length === 0) {
            console.log('❌ No se encontró el cliente');
            return;
        }
        
        const cliente = rows[0];
        console.log('👤 Cliente encontrado:', cliente.email);
        
        // Probar diferentes contraseñas comunes
        const passwordsToTest = ['123456', 'password', 'password123', 'test123', 'cliente123'];
        
        for (const pwd of passwordsToTest) {
            const isValid = await bcrypt.compare(pwd, cliente.contraseña);
            console.log(`🔑 Contraseña "${pwd}": ${isValid ? '✅ VÁLIDA' : '❌ Inválida'}`);
            if (isValid) break;
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkPassword();
