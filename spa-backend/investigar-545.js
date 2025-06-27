const db = require('./db');

async function investigarTurno545() {
    try {
        console.log('🔍 INVESTIGANDO TURNO 545 Y CONFLICTO CON TURNO 75\n');
        
        // Verificar turnos específicos
        const [turnos] = await db.query(`
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora,
                t.hora_fin,
                t.estado,
                CONCAT(e.nombre, ' ', e.apellido) as empleado
            FROM turno t
            JOIN turno_empleado te ON t.id_turno = te.id_turno
            JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_turno IN (75, 545)
            ORDER BY t.id_turno
        `);
        
        console.log('📋 DETALLES DE LOS TURNOS:');
        turnos.forEach(turno => {
            console.log(`   🎯 Turno ${turno.id_turno}:`);
            console.log(`      📅 Fecha: ${turno.fecha.toISOString().split('T')[0]}`);
            console.log(`      ⏰ Hora: ${turno.hora} - ${turno.hora_fin}`);
            console.log(`      👤 Empleado: ${turno.empleado}`);
            console.log(`      🔄 Estado: ${turno.estado}\n`);
        });
        
        if (turnos.length >= 2) {
            const turno75 = turnos.find(t => t.id_turno === 75);
            const turno545 = turnos.find(t => t.id_turno === 545);
            
            if (turno75 && turno545) {
                console.log('🔍 ANÁLISIS DE CONFLICTO:');
                
                // Verificar si es el mismo empleado
                const mismoEmpleado = turno75.empleado === turno545.empleado;
                console.log(`   👥 Mismo empleado: ${mismoEmpleado ? 'SÍ' : 'NO'}`);
                
                // Verificar si es la misma fecha
                const mismaFecha = turno75.fecha.toISOString().split('T')[0] === turno545.fecha.toISOString().split('T')[0];
                console.log(`   📅 Misma fecha: ${mismaFecha ? 'SÍ' : 'NO'}`);
                
                if (mismoEmpleado && mismaFecha) {
                    // Verificar solapamiento de horarios
                    const hora75_inicio = turno75.hora;
                    const hora75_fin = turno75.hora_fin;
                    const hora545_inicio = turno545.hora;
                    const hora545_fin = turno545.hora_fin;
                    
                    const solapa = (hora75_inicio < hora545_fin && hora75_fin > hora545_inicio);
                    
                    console.log(`   ⏰ Horarios:`);
                    console.log(`      Turno 75:  ${hora75_inicio} - ${hora75_fin}`);
                    console.log(`      Turno 545: ${hora545_inicio} - ${hora545_fin}`);
                    console.log(`   🚨 ¿HAY SOLAPAMIENTO?: ${solapa ? 'SÍ' : 'NO'}`);
                    
                    if (solapa) {
                        console.log('\n❌ ESTE ES UN CONFLICTO REAL QUE DEBERÍA HABER SIDO RECHAZADO');
                    }
                }
            }
        }
        
        // Verificar todos los turnos de Eladio Carrión en esa fecha
        console.log('\n📊 TODOS LOS TURNOS DE ELADIO CARRIÓN:');
        const [turnosEladio] = await db.query(`
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora,
                t.hora_fin,
                t.estado
            FROM turno t
            JOIN turno_empleado te ON t.id_turno = te.id_turno
            JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE e.nombre = 'Eladio' AND e.apellido = 'Carrión'
            AND t.fecha = '2025-07-03'
            ORDER BY t.hora
        `);
        
        turnosEladio.forEach(turno => {
            console.log(`   🎯 Turno ${turno.id_turno}: ${turno.hora} - ${turno.hora_fin} (${turno.estado})`);
        });
        
        // Buscar conflictos entre todos los turnos de Eladio
        console.log('\n🔍 DETECTANDO CONFLICTOS ENTRE TURNOS DE ELADIO:');
        for (let i = 0; i < turnosEladio.length; i++) {
            for (let j = i + 1; j < turnosEladio.length; j++) {
                const turno1 = turnosEladio[i];
                const turno2 = turnosEladio[j];
                
                const solapa = (turno1.hora < turno2.hora_fin && turno1.hora_fin > turno2.hora);
                
                if (solapa) {
                    console.log(`   🚨 CONFLICTO: Turno ${turno1.id_turno} (${turno1.hora}-${turno1.hora_fin}) vs Turno ${turno2.id_turno} (${turno2.hora}-${turno2.hora_fin})`);
                }
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

investigarTurno545();
