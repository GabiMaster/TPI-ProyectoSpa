const db = require('./db');
const jwt = require('jsonwebtoken');

async function crearTurnoPrueba() {
    try {
        // Crear un turno futuro (más de 48h) para prueba
        const fechaFutura = new Date();
        fechaFutura.setDate(fechaFutura.getDate() + 3); // 3 días en el futuro
        
        const [result] = await db.query(
            'INSERT INTO turno (fecha, hora, hora_fin, duracion_total, precio_total, metodo_pago, estado, id_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [fechaFutura.toISOString().split('T')[0], '14:00:00', '15:00:00', 60, 50.00, 'efectivo', 'reservado', 43]
        );
        
        console.log('✅ Turno de prueba creado con ID:', result.insertId);
        
        // Generar token de cliente
        const token = jwt.sign({id: 43, role: 'cliente'}, 'tu_clave_secreta', {expiresIn: '1h'});
        console.log('🔑 Token cliente:', token);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

crearTurnoPrueba();
