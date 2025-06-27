const db = require('./db');

async function checkEmpleadoStructure() {
    try {
        console.log('=== ESTRUCTURA DE EMPLEADOS Y TURNOS ===');
        
        // Verificar tabla turno_empleado
        const [teColumns] = await db.query('DESCRIBE turno_empleado');
        console.log('\nColumnas turno_empleado:');
        teColumns.forEach(col => console.log('- ' + col.Field + ' (' + col.Type + ')'));
        
        // Ver algunos datos de ejemplo
        const [empleados] = await db.query('SELECT id_empleado, nombre, apellido FROM empleado LIMIT 5');
        console.log('\nEmpleados disponibles:');
        empleados.forEach(emp => console.log('- ID:', emp.id_empleado, ', Nombre:', emp.nombre, emp.apellido));
        
        // Ver asignaciones actuales
        const [asignaciones] = await db.query(`
            SELECT te.id_turno, te.id_empleado, t.fecha, t.hora, t.hora_fin, 
                   CONCAT(e.nombre, ' ', e.apellido) as empleado_nombre
            FROM turno_empleado te
            JOIN turno t ON te.id_turno = t.id_turno
            JOIN empleado e ON te.id_empleado = e.id_empleado
            ORDER BY t.fecha, t.hora
        `);
        
        console.log('\nAsignaciones actuales:');
        asignaciones.forEach(asig => {
            console.log(`- Turno ${asig.id_turno}: ${asig.empleado_nombre} | Fecha: ${asig.fecha.toISOString().split('T')[0]} | Horario: ${asig.hora}-${asig.hora_fin}`);
        });
        
        // Buscar posibles solapamientos
        console.log('\n=== ANÁLISIS DE SOLAPAMIENTOS ===');
        const [solapamientos] = await db.query(`
            SELECT 
                te1.id_empleado,
                CONCAT(e.nombre, ' ', e.apellido) as empleado_nombre,
                te1.id_turno as turno1,
                te2.id_turno as turno2,
                t1.fecha,
                t1.hora as hora1_inicio,
                t1.hora_fin as hora1_fin,
                t2.hora as hora2_inicio,
                t2.hora_fin as hora2_fin
            FROM turno_empleado te1
            JOIN turno_empleado te2 ON te1.id_empleado = te2.id_empleado AND te1.id_turno < te2.id_turno
            JOIN turno t1 ON te1.id_turno = t1.id_turno
            JOIN turno t2 ON te2.id_turno = t2.id_turno
            JOIN empleado e ON te1.id_empleado = e.id_empleado
            WHERE t1.fecha = t2.fecha
            AND (
                (t1.hora < t2.hora_fin AND t1.hora_fin > t2.hora) OR
                (t2.hora < t1.hora_fin AND t2.hora_fin > t1.hora)
            )
            ORDER BY te1.id_empleado, t1.fecha, t1.hora
        `);
        
        if (solapamientos.length > 0) {
            console.log('❌ SOLAPAMIENTOS ENCONTRADOS:');
            solapamientos.forEach(solap => {
                console.log(`- Empleado: ${solap.empleado_nombre}`);
                console.log(`  Turno ${solap.turno1}: ${solap.hora1_inicio}-${solap.hora1_fin}`);
                console.log(`  Turno ${solap.turno2}: ${solap.hora2_inicio}-${solap.hora2_fin}`);
                console.log(`  Fecha: ${solap.fecha.toISOString().split('T')[0]}\n`);
            });
        } else {
            console.log('✅ No se encontraron solapamientos actuales');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkEmpleadoStructure();
