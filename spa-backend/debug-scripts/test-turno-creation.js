const db = require('./db');

async function testTurnoCreation() {
    try {
        console.log('🧪 Probando los datos necesarios para crear turnos...');
        
        // Verificar que existen servicios
        const [servicios] = await db.query('SELECT id_servicio, nombre FROM servicio LIMIT 3');
        console.log(`✅ Servicios disponibles: ${servicios.length}`);
        servicios.forEach(s => console.log(`   - ID: ${s.id_servicio}, Nombre: ${s.nombre}`));
        
        // Verificar que existen empleados
        const [empleados] = await db.query('SELECT id_empleado, nombre, apellido FROM empleado LIMIT 3');
        console.log(`✅ Empleados disponibles: ${empleados.length}`);
        empleados.forEach(e => console.log(`   - ID: ${e.id_empleado}, Nombre: ${e.nombre} ${e.apellido}`));
        
        // Verificar estructura de tabla turno
        const [structure] = await db.query('DESCRIBE turno');
        console.log('\n📊 Campos requeridos en tabla turno:');
        structure.forEach(col => {
            if (['fecha', 'hora', 'hora_fin', 'precio_total', 'duracion_total'].includes(col.Field)) {
                console.log(`   ✅ ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(Nullable)' : '(Not Null)'}`);
            }
        });
        
        console.log('\n🎯 Para crear un turno se necesita:');
        console.log('   - servicios: Array de IDs de servicios');
        console.log('   - empleados: Array de IDs de empleados'); 
        console.log('   - fecha: Formato YYYY-MM-DD');
        console.log('   - hora_inicio: Formato HH:MM');
        console.log('   - hora_fin: Formato HH:MM');
        console.log('   - precio_total: Número (decimal)');
        console.log('   - duracion_total: Número (minutos)');
        
        console.log('\n✅ El backend ahora espera precio_total en lugar de precio');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testTurnoCreation();
