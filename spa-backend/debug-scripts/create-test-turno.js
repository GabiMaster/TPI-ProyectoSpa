const db = require('../db');

async function createTestTurno() {
    try {
        // Crear un nuevo turno para el 30/06/2025 a las 15:00
        const [result] = await db.query(`
            INSERT INTO turno (fecha, hora, hora_fin, duracion_total, precio_total, estado, metodo_pago)
            VALUES ('2025-06-30', '15:00:00', '16:00:00', 60, 110.00, 'disponible', 'efectivo')
        `);
        
        const turnoId = result.insertId;
        console.log(`✅ Turno creado con ID: ${turnoId}`);
        
        // Agregar servicios al turno (por ejemplo, masaje)
        await db.query(`
            INSERT INTO turno_servicio (id_turno, id_servicio)
            SELECT ?, id_servicio FROM servicio WHERE nombre LIKE '%masaje%' LIMIT 1
        `, [turnoId]);
        
        // Agregar empleado al turno
        await db.query(`
            INSERT INTO turno_empleado (id_turno, id_empleado)
            SELECT ?, id_empleado FROM empleado LIMIT 1
        `, [turnoId]);
        
        console.log(`✅ Turno ${turnoId} configurado para testing`);
        console.log('Fecha: 30/06/2025');
        console.log('Hora: 15:00-16:00');
        console.log('Precio: $110.00');
        console.log('Estado: disponible');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

createTestTurno();
