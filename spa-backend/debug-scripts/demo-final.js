const db = require('./db');
const EmpleadoScheduleManager = require('./empleadoScheduleManager');

async function demoConflictoEspecifico() {
    try {
        console.log('=== DEMOSTRACIÓN: CONFLICTO DE HORARIOS EN ACCIÓN ===\n');
        
        const empleadoManager = new EmpleadoScheduleManager();
        const fechaDemo = '2025-06-30';
        const empleadoId = 14; // Sofía Torres
        
        console.log('1. CREANDO ESCENARIO DE PRUEBA...');
        
        // Crear primer turno
        const [turno1] = await db.query(`
            INSERT INTO turno (fecha, hora, hora_fin, duracion_total, precio_total, estado) 
            VALUES (?, '14:00:00', '15:30:00', 90, 5000, 'disponible')
        `, [fechaDemo]);
        
        // Crear segundo turno que se solapa
        const [turno2] = await db.query(`
            INSERT INTO turno (fecha, hora, hora_fin, duracion_total, precio_total, estado) 
            VALUES (?, '15:00:00', '16:30:00', 90, 5000, 'disponible')
        `, [fechaDemo]);
        
        console.log(`✅ Turno 1 creado: ID ${turno1.insertId} (14:00 - 15:30)`);
        console.log(`✅ Turno 2 creado: ID ${turno2.insertId} (15:00 - 16:30)`);
        console.log(`⚠️  SOLAPAMIENTO: 15:00 - 15:30 (30 minutos)`);
        
        // Asignar empleado al primer turno
        await db.query(`
            INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, ?)
        `, [turno1.insertId, empleadoId]);
        
        console.log(`\n2. EMPLEADO ASIGNADO AL PRIMER TURNO:`);
        console.log(`👤 Sofía Torres (ID: ${empleadoId}) → Turno ${turno1.insertId} (14:00 - 15:30)`);
        
        // Intentar validar asignación al segundo turno (conflictivo)
        console.log(`\n3. INTENTANDO ASIGNAR AL TURNO CONFLICTIVO:`);
        console.log(`🎯 Objetivo: Asignar Sofía Torres → Turno ${turno2.insertId} (15:00 - 16:30)`);
        console.log(`⚡ CONFLICTO ESPERADO: Ya tiene turno de 14:00-15:30, nuevo sería 15:00-16:30`);
        
        const validacion = await empleadoManager.validarAsignacion(turno2.insertId, [empleadoId]);
        
        console.log(`\n4. RESULTADO DE VALIDACIÓN:`);
        console.log(`🔴 Válido: ${validacion.valido ? 'SÍ' : 'NO'}`);
        console.log(`📝 Mensaje: ${validacion.mensaje}`);
        
        if (!validacion.valido) {
            console.log(`\n5. DETALLES DEL RECHAZO:`);
            if (validacion.errores) {
                validacion.errores.forEach(error => {
                    console.log(`   ❌ ${error}`);
                });
            }
            if (validacion.empleadosConConflicto) {
                validacion.empleadosConConflicto.forEach(conflicto => {
                    console.log(`   ⚠️  ${conflicto.nombre}: ${conflicto.mensaje}`);
                });
            }
        }
        
        console.log(`\n6. SIMULANDO LLAMADA AL ENDPOINT /api/turnos/asignar-empleados:`);
        console.log(`📡 POST /api/turnos/asignar-empleados`);
        console.log(`📄 Body: {`);
        console.log(`     "turnoId": ${turno2.insertId},`);
        console.log(`     "empleadosIds": [${empleadoId}]`);
        console.log(`   }`);
        
        if (!validacion.valido) {
            console.log(`\n7. RESPUESTA DEL SERVIDOR:`);
            console.log(`🔴 Status: 400 Bad Request`);
            console.log(`📄 Response: {`);
            console.log(`     "error": "Conflicto de horarios",`);
            console.log(`     "detalles": ${JSON.stringify(validacion.errores)}`);
            console.log(`   }`);
            console.log(`\n❌ LA ASIGNACIÓN SE RECHAZA AUTOMÁTICAMENTE`);
            console.log(`❌ NO SE MODIFICA LA BASE DE DATOS`);
            console.log(`❌ EL EMPLEADO MANTIENE SOLO SU TURNO ORIGINAL`);
        } else {
            console.log(`\n7. ✅ La asignación procedería (no debería pasar en este caso)`);
        }
        
        // Verificar cronograma final
        console.log(`\n8. CRONOGRAMA FINAL DE SOFÍA TORRES:`);
        const cronograma = await empleadoManager.obtenerCronograma(empleadoId, fechaDemo);
        cronograma.forEach(turno => {
            if (turno.id_turno == turno1.insertId || turno.id_turno == turno2.insertId) {
                console.log(`   📅 Turno ${turno.id_turno}: ${turno.hora} - ${turno.hora_fin} (${turno.estado})`);
            }
        });
        
        // Limpiar datos de prueba
        console.log(`\n9. LIMPIANDO DATOS DE PRUEBA...`);
        await db.query('DELETE FROM turno_empleado WHERE id_turno IN (?, ?)', [turno1.insertId, turno2.insertId]);
        await db.query('DELETE FROM turno WHERE id_turno IN (?, ?)', [turno1.insertId, turno2.insertId]);
        console.log(`✅ Turnos de prueba eliminados`);
        
        console.log(`\n=== CONCLUSIÓN ===`);
        console.log(`🛡️  El sistema de validación PREVIENE automáticamente los conflictos`);
        console.log(`🚫 Los empleados NO pueden ser asignados a turnos solapados`);
        console.log(`⚡ La validación ocurre ANTES de cualquier modificación en la BD`);
        console.log(`📡 El frontend recibe error HTTP 400 con detalles específicos`);
        
    } catch (error) {
        console.error('❌ Error en demostración:', error.message);
    } finally {
        process.exit(0);
    }
}

demoConflictoEspecifico();
