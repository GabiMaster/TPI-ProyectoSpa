const db = require('./db');
const EmpleadoScheduleManager = require('./empleadoScheduleManager');

async function probarValidacionDirecta() {
    try {
        console.log('🧪 PRUEBA DIRECTA DE VALIDACIÓN DE CONFLICTOS\n');
        
        const empleadoManager = new EmpleadoScheduleManager();
        
        // Datos que deberían generar conflicto (basado en turnos existentes)
        const empleadoId = 7; // Eladio Carrión
        const fecha = '2025-07-03';
        const horaInicio = '15:30:00'; // Hora que debería chocar con turno 75 (14:30-16:00)
        const horaFin = '17:30:00';
        
        console.log('📋 DATOS DE PRUEBA:');
        console.log(`   Empleado: ${empleadoId} (Eladio Carrión)`);
        console.log(`   Fecha: ${fecha}`);
        console.log(`   Hora: ${horaInicio} - ${horaFin}`);
        console.log(`   Conflicto esperado: Con turno 75 (14:30-16:00)\n`);
        
        console.log('1. 🔍 EJECUTANDO VALIDACIÓN...');
        const validacion = await empleadoManager.verificarDisponibilidadMultiple(
            [empleadoId], fecha, horaInicio, horaFin
        );
        
        console.log('2. 📊 RESULTADO:');
        console.log(`   Empleados disponibles: ${validacion.disponibles.length}`);
        console.log(`   Empleados con conflicto: ${validacion.conflictos.length}`);
        
        if (validacion.conflictos.length > 0) {
            console.log('\n3. 🚨 CONFLICTOS DETECTADOS:');
            validacion.conflictos.forEach(conflicto => {
                console.log(`   - ${conflicto.nombre}: ${conflicto.mensaje}`);
                if (conflicto.turnosConflictivos) {
                    conflicto.turnosConflictivos.forEach(turno => {
                        console.log(`     • Turno ${turno.id_turno}: ${turno.hora} - ${turno.hora_fin}`);
                    });
                }
            });
        } else {
            console.log('\n3. ✅ NO HAY CONFLICTOS');
        }
        
        console.log('\n4. 📡 SIMULACIÓN DE RESPUESTA HTTP:');
        if (validacion.conflictos.length > 0) {
            const respuesta = {
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
            console.log('   Body:', JSON.stringify(respuesta, null, 2));
        } else {
            console.log('   Status: 201 Created');
            console.log('   Body: { message: "Turno creado exitosamente" }');
        }
        
        console.log('\n🔍 CONCLUSIÓN:');
        if (validacion.conflictos.length > 0) {
            console.log('❌ EL SISTEMA DETECTA CONFLICTOS CORRECTAMENTE');
            console.log('❓ Si aún puedes crear turnos, el problema es que:');
            console.log('   1. No estás usando el endpoint /api/admin/turnos');
            console.log('   2. El servidor no se reinició con los cambios');
            console.log('   3. Hay otro endpoint sin validación');
        } else {
            console.log('❓ El sistema no detectó conflictos (revisar datos)');
        }
        
    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

probarValidacionDirecta();
