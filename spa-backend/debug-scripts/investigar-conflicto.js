const db = require('./db');

async function investigarConflicto() {
    try {
        console.log('🔍 INVESTIGANDO CONFLICTO DE TURNOS 543, 544 y 75 CON EMPLEADO ID 7\n');
        
        // Obtener detalles de los turnos específicos
        const [turnos] = await db.query(`
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora,
                t.hora_fin,
                t.estado,
                GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido)) as empleados,
                GROUP_CONCAT(DISTINCT e.id_empleado) as empleados_ids
            FROM turno t
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_turno IN (543, 544, 75)
            GROUP BY t.id_turno
            ORDER BY t.fecha, t.hora
        `);
        
        console.log('DETALLES DE LOS TURNOS:');
        turnos.forEach(turno => {
            console.log(`📅 Turno ${turno.id_turno}:`);
            console.log(`   Fecha: ${turno.fecha ? turno.fecha.toISOString().split('T')[0] : 'N/A'}`);
            console.log(`   Hora: ${turno.hora} - ${turno.hora_fin}`);
            console.log(`   Estado: ${turno.estado}`);
            console.log(`   Empleados: ${turno.empleados || 'Sin asignar'}`);
            console.log(`   IDs Empleados: ${turno.empleados_ids || 'N/A'}`);
            console.log('');
        });
        
        // Verificar si hay solapamientos
        console.log('ANÁLISIS DE SOLAPAMIENTOS:');
        const turnosEmpleado7 = turnos.filter(t => t.empleados_ids && t.empleados_ids.includes('7'));
        
        for (let i = 0; i < turnosEmpleado7.length; i++) {
            for (let j = i + 1; j < turnosEmpleado7.length; j++) {
                const turno1 = turnosEmpleado7[i];
                const turno2 = turnosEmpleado7[j];
                
                // Verificar si están en la misma fecha
                const fecha1 = turno1.fecha.toISOString().split('T')[0];
                const fecha2 = turno2.fecha.toISOString().split('T')[0];
                
                if (fecha1 === fecha2) {
                    const hora1_inicio = turno1.hora;
                    const hora1_fin = turno1.hora_fin;
                    const hora2_inicio = turno2.hora;
                    const hora2_fin = turno2.hora_fin;
                    
                    // Verificar solapamiento
                    const solapa = (hora1_inicio < hora2_fin && hora1_fin > hora2_inicio);
                    
                    console.log(`${solapa ? '🚨' : '✅'} Turno ${turno1.id_turno} vs Turno ${turno2.id_turno}:`);
                    console.log(`   Fecha: ${fecha1}`);
                    console.log(`   ${turno1.id_turno}: ${hora1_inicio} - ${hora1_fin}`);
                    console.log(`   ${turno2.id_turno}: ${hora2_inicio} - ${hora2_fin}`);
                    console.log(`   ${solapa ? 'CONFLICTO DETECTADO' : 'Sin conflicto'}\n`);
                }
            }
        }
        
        // Verificar por qué no funcionó la validación
        console.log('🔍 VERIFICANDO POR QUÉ NO FUNCIONÓ LA VALIDACIÓN:\n');
        
        // Simular la validación que debería haber ocurrido
        const EmpleadoScheduleManager = require('./empleadoScheduleManager');
        const empleadoManager = new EmpleadoScheduleManager();
        
        // Simular validación para turno 543
        const turno543 = turnos.find(t => t.id_turno === 543);
        if (turno543) {
            console.log(`Simulando validación para turno 543:`);
            console.log(`Fecha: ${turno543.fecha.toISOString().split('T')[0]}`);
            console.log(`Hora: ${turno543.hora} - ${turno543.hora_fin}`);
            console.log(`Empleado: 7`);
            
            const validacion = await empleadoManager.verificarDisponibilidadMultiple(
                [7], 
                turno543.fecha.toISOString().split('T')[0], 
                turno543.hora, 
                turno543.hora_fin,
                543 // Excluir el propio turno
            );
            
            console.log(`Resultado de validación:`);
            console.log(`- Disponibles: ${validacion.disponibles.length}`);
            console.log(`- Conflictos: ${validacion.conflictos.length}`);
            if (validacion.conflictos.length > 0) {
                validacion.conflictos.forEach(conflicto => {
                    console.log(`  - ${conflicto.nombre}: ${conflicto.mensaje}`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Error investigando:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

investigarConflicto();
