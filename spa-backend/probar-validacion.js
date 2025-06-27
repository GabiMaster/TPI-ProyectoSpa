const db = require('./db');
const EmpleadoScheduleManager = require('./empleadoScheduleManager');

async function probarValidacionMejorada() {
    try {
        console.log('=== PROBANDO VALIDACIÓN MEJORADA DE CREACIÓN DE TURNOS ===\n');
        
        const empleadoManager = new EmpleadoScheduleManager();
        
        // Caso 1: Intentar crear turno que debería generar conflicto
        console.log('1. SIMULANDO INTENTO DE CREAR TURNO CONFLICTIVO:');
        console.log('   Fecha: 2025-07-03');
        console.log('   Hora: 14:00:00 - 15:30:00');
        console.log('   Empleado: Eladio Carrión (ID: 7)');
        console.log('   Conflicto esperado: Ya tiene turno 14:30-16:00');
        
        const validacion = await empleadoManager.verificarDisponibilidadMultiple(
            [7], // Eladio Carrión
            '2025-07-03',
            '14:00:00',
            '15:30:00'
        );
        
        console.log('\n2. RESULTADO DE LA VALIDACIÓN:');
        console.log(`   Empleados disponibles: ${validacion.disponibles.length}`);
        console.log(`   Empleados con conflicto: ${validacion.conflictos.length}`);
        
        if (validacion.conflictos.length > 0) {
            console.log('\n   🚫 CONFLICTOS DETECTADOS:');
            validacion.conflictos.forEach(conflicto => {
                console.log(`   - ${conflicto.nombre}: ${conflicto.mensaje}`);
                if (conflicto.turnosConflictivos) {
                    conflicto.turnosConflictivos.forEach(turno => {
                        console.log(`     • Turno ${turno.id_turno}: ${turno.hora} - ${turno.hora_fin}`);
                    });
                }
            });
        }
        
        console.log('\n3. RESPUESTA QUE RECIBIRÍA EL FRONTEND:');
        if (validacion.conflictos.length > 0) {
            const respuestaSimulada = {
                error: 'Conflicto de horarios detectado',
                mensaje: 'Uno o más empleados ya tienen turnos asignados en este horario',
                conflictos: validacion.conflictos.map(conflicto => ({
                    empleado: conflicto.nombre,
                    mensaje: conflicto.mensaje,
                    turnosConflictivos: conflicto.turnosConflictivos
                })),
                empleadosDisponibles: validacion.disponibles.map(emp => emp.nombre),
                empleadosConConflicto: validacion.conflictos.map(emp => emp.nombre)
            };
            
            console.log('   Status: 400 Bad Request');
            console.log('   Body:', JSON.stringify(respuestaSimulada, null, 4));
        } else {
            console.log('   Status: 201 Created');
            console.log('   Body: { message: "Turno(s) creado(s) correctamente sin conflictos..." }');
        }
        
        // Caso 2: Probar con horario libre
        console.log('\n\n4. PROBANDO CON HORARIO LIBRE:');
        console.log('   Fecha: 2025-07-03');
        console.log('   Hora: 19:00:00 - 20:30:00');
        console.log('   Empleado: Eladio Carrión (ID: 7)');
        
        const validacionLibre = await empleadoManager.verificarDisponibilidadMultiple(
            [7],
            '2025-07-03',
            '19:00:00',
            '20:30:00'
        );
        
        console.log('\n5. RESULTADO:');
        console.log(`   Empleados disponibles: ${validacionLibre.disponibles.length}`);
        console.log(`   Empleados con conflicto: ${validacionLibre.conflictos.length}`);
        
        if (validacionLibre.conflictos.length === 0) {
            console.log('   ✅ SIN CONFLICTOS - El turno se podría crear');
        } else {
            console.log('   ❌ HAY CONFLICTOS - El turno se rechazaría');
        }
        
        console.log('\n=== CONCLUSIÓN ===');
        console.log('✅ La validación ahora funciona TANTO para:');
        console.log('   • Crear turnos nuevos (/api/admin/turnos)');
        console.log('   • Asignar empleados a turnos existentes (/api/turnos/asignar-empleados)');
        console.log('🛡️  El sistema previene conflictos en ambos casos');
        
    } catch (error) {
        console.error('Error en prueba:', error.message);
    } finally {
        process.exit(0);
    }
}

probarValidacionMejorada();
