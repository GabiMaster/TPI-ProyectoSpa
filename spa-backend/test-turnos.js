const db = require('./db');

async function crearTurnosPrueba() {
    try {
        console.log('Creando turnos de prueba...');
        
        // Turno 1: Solo Belleza (categoria específica)
        const [result1] = await db.query(
            `INSERT INTO turno (fecha, hora, hora_fin, precio, duracion_total, estado) 
             VALUES ('2025-06-28', '10:00:00', '11:00:00', 80.00, 60, 'disponible')`
        );
        const turno1Id = result1.insertId;
        
        // Asociar con servicio de Belleza (ID: 8 - Depilación facial)
        await db.query(
            `INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, 8)`,
            [turno1Id]
        );
        
        // Asociar con empleado (ID: 9 - Esteticista)
        await db.query(
            `INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, 9)`,
            [turno1Id]
        );
        
        console.log(`Turno 1 creado (ID: ${turno1Id}) - Solo Belleza`);
        
        // Turno 2: Solo Masajes (categoria específica)
        const [result2] = await db.query(
            `INSERT INTO turno (fecha, hora, hora_fin, precio, duracion_total, estado) 
             VALUES ('2025-06-28', '14:00:00', '15:30:00', 120.00, 90, 'disponible')`
        );
        const turno2Id = result2.insertId;
        
        // Asociar con servicio de Masajes (ID: 4 - Descontracturantes)
        await db.query(
            `INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, 4)`,
            [turno2Id]
        );
        
        await db.query(
            `INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, 5)`,
            [turno2Id]
        );
        
        console.log(`Turno 2 creado (ID: ${turno2Id}) - Solo Masajes`);
        
        // Turno 3: Combo (Belleza + Masajes) - debe aparecer solo en Combos
        const [result3] = await db.query(
            `INSERT INTO turno (fecha, hora, hora_fin, precio, duracion_total, estado) 
             VALUES ('2025-06-29', '16:00:00', '18:00:00', 180.00, 120, 'disponible')`
        );
        const turno3Id = result3.insertId;
        
        // Asociar con servicios de diferentes categorías (Belleza ID: 8 + Masajes ID: 4)
        await db.query(
            `INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, 8), (?, 4)`,
            [turno3Id, turno3Id]
        );
        
        await db.query(
            `INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, 5), (?, 9)`,
            [turno3Id, turno3Id]
        );
        
        console.log(`Turno 3 creado (ID: ${turno3Id}) - Combo (Belleza + Masajes)`);
        
        // Turno 4: Solo Tratamientos Corporales
        const [result4] = await db.query(
            `INSERT INTO turno (fecha, hora, hora_fin, precio, duracion_total, estado) 
             VALUES ('2025-06-30', '11:00:00', '12:00:00', 100.00, 60, 'disponible')`
        );
        const turno4Id = result4.insertId;
        
        // Asociar con servicio de Tratamientos Corporales (ID: 13 - VelaSlim)
        await db.query(
            `INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, 13)`,
            [turno4Id]
        );
        
        await db.query(
            `INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, 9)`,
            [turno4Id]
        );
        
        console.log(`Turno 4 creado (ID: ${turno4Id}) - Solo Tratamientos Corporales`);
        
        console.log('Turnos de prueba creados exitosamente!');
        
    } catch (error) {
        console.error('Error al crear turnos de prueba:', error);
    } finally {
        process.exit(0);
    }
}

crearTurnosPrueba();
