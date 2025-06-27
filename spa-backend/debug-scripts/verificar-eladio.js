const db = require('./db');

async function verificarConflictoEladio() {
    try {
        console.log('=== VERIFICANDO CONFLICTO DE ELADIO CARRIÓN ===');
        
        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.estado,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido)) as empleados
            FROM turno t
            JOIN turno_empleado te ON t.id_turno = te.id_turno
            JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_turno IN (75, 541, 542) OR 
                  (e.nombre = 'Eladio' AND e.apellido = 'Carrión' AND t.fecha = '2025-07-03')
            GROUP BY t.id_turno
            ORDER BY t.fecha, t.hora
        `);
        
        console.log('Turnos encontrados:');
        turnos.forEach(turno => {
            console.log(`- Turno ${turno.id_turno}: ${turno.fecha} ${turno.hora}-${turno.hora_fin} (${turno.empleados})`);
        });
        
        // Buscar solapamientos
        const turnosEladioFecha = turnos.filter(t => t.empleados && t.empleados.includes('Eladio Carrión'));
        
        console.log(`\nTurnos de Eladio Carrión el 3/7/2025: ${turnosEladioFecha.length}`);
        
        for (let i = 0; i < turnosEladioFecha.length; i++) {
            for (let j = i + 1; j < turnosEladioFecha.length; j++) {
                const turno1 = turnosEladioFecha[i];
                const turno2 = turnosEladioFecha[j];
                
                const hora1_inicio = turno1.hora;
                const hora1_fin = turno1.hora_fin;
                const hora2_inicio = turno2.hora;
                const hora2_fin = turno2.hora_fin;
                
                // Verificar solapamiento
                const solapa = (hora1_inicio < hora2_fin && hora1_fin > hora2_inicio);
                
                if (solapa) {
                    console.log(`\n🚨 CONFLICTO DETECTADO:`);
                    console.log(`   Turno ${turno1.id_turno}: ${hora1_inicio} - ${hora1_fin}`);
                    console.log(`   Turno ${turno2.id_turno}: ${hora2_inicio} - ${hora2_fin}`);
                    console.log(`   ⚠️  ¡HAY SOLAPAMIENTO!`);
                } else {
                    console.log(`\n✅ No hay conflicto:`);
                    console.log(`   Turno ${turno1.id_turno}: ${hora1_inicio} - ${hora1_fin}`);
                    console.log(`   Turno ${turno2.id_turno}: ${hora2_inicio} - ${hora2_fin}`);
                }
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

verificarConflictoEladio();
