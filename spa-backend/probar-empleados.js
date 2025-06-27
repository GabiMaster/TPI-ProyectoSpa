const db = require('./db');
const EmpleadoScheduleManager = require('./empleadoScheduleManager');

async function probarValidacionEmpleados() {
    try {
        console.log('=== PRUEBA DE VALIDACIÓN DE EMPLEADOS ===\n');
        
        const manager = new EmpleadoScheduleManager();
        
        // 1. Crear turnos de prueba con el mismo empleado en horarios solapados
        console.log('1. Creando turnos para prueba de solapamiento...');
        
        const empleadoTest = 5; // Esteban Quito
        const fechaTest = '2025-06-30';
        
        // Turno 1: 10:00-12:00
        const [result1] = await db.query(`
            INSERT INTO turno (fecha, hora, hora_fin, estado, precio_total)
            VALUES (?, '10:00:00', '12:00:00', 'disponible', 8000)
        `, [fechaTest]);
        const turno1Id = result1.insertId;
        
        // Asignar empleado al turno 1
        await db.query('INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, ?)', [turno1Id, empleadoTest]);
        console.log(`✅ Turno ${turno1Id} creado: 10:00-12:00 con empleado ${empleadoTest}`);
        
        // 2. Intentar verificar disponibilidad del mismo empleado en horario solapado
        console.log('\n2. Verificando disponibilidad en horario solapado...');
        
        const disponible = await manager.verificarDisponibilidad(empleadoTest, fechaTest, '11:00:00', '13:00:00');
        console.log(`Empleado ${empleadoTest} disponible 11:00-13:00: ${disponible ? '✅ SÍ' : '❌ NO'}`);
        
        // 3. Verificar disponibilidad en horario libre
        console.log('\n3. Verificando disponibilidad en horario libre...');
        
        const disponible2 = await manager.verificarDisponibilidad(empleadoTest, fechaTest, '14:00:00', '16:00:00');
        console.log(`Empleado ${empleadoTest} disponible 14:00-16:00: ${disponible2 ? '✅ SÍ' : '❌ NO'}`);
        
        // 4. Probar validación múltiple
        console.log('\n4. Probando validación múltiple...');
        
        const resultado = await manager.verificarDisponibilidadMultiple(
            [5, 6, 7], // Múltiples empleados
            fechaTest,
            '11:00:00',
            '13:00:00'
        );
        
        console.log('Empleados disponibles:', resultado.disponibles);
        console.log('Empleados con conflicto:', resultado.conflictos.map(c => c.nombre));
        
        // 5. Obtener cronograma
        console.log('\n5. Cronograma del empleado:');
        const cronograma = await manager.obtenerCronograma(empleadoTest, fechaTest);
        cronograma.forEach(turno => {
            console.log(`   - Turno ${turno.id_turno}: ${turno.hora}-${turno.hora_fin} | ${turno.estado} | ${turno.servicios || 'Sin servicios'}`);
        });
        
        // 6. Probar endpoint de validación de asignación
        console.log('\n6. Validando asignación...');
        
        const validacion = await manager.validarAsignacion(turno1Id, [empleadoTest, 6]);
        console.log(`Validación para turno ${turno1Id}:`, validacion.valido ? '✅ VÁLIDA' : '❌ INVÁLIDA');
        if (!validacion.valido) {
            validacion.errores.forEach(error => console.log(`   - ${error}`));
        }
        
        // Limpiar
        await db.query('DELETE FROM turno_empleado WHERE id_turno = ?', [turno1Id]);
        await db.query('DELETE FROM turno WHERE id_turno = ?', [turno1Id]);
        console.log('\n🗑️ Datos de prueba eliminados');
        
        console.log('\n✅ PRUEBA COMPLETADA');
        
    } catch (error) {
        console.error('Error en prueba:', error);
    } finally {
        process.exit(0);
    }
}

probarValidacionEmpleados();
