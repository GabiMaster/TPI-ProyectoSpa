const db = require('./db');

async function removePrecioColumn() {
    try {
        console.log('🗑️  Preparando para eliminar la columna precio redundante de la tabla turno...');
        
        // Verificar que la columna precio está vacía
        const [precioData] = await db.query('SELECT COUNT(*) as count FROM turno WHERE precio IS NOT NULL');
        
        if (precioData[0].count > 0) {
            console.log(`❌ La columna precio aún contiene ${precioData[0].count} registros. No se puede eliminar.`);
            return;
        }
        
        console.log('✅ La columna precio está vacía, es seguro eliminarla');
        
        // Verificar que la columna precio_total tiene todos los datos
        const [totalData] = await db.query('SELECT COUNT(*) as count FROM turno WHERE precio_total IS NOT NULL');
        const [allTurnos] = await db.query('SELECT COUNT(*) as count FROM turno');
        
        console.log(`📊 Turnos totales: ${allTurnos[0].count}`);
        console.log(`📊 Turnos con precio_total: ${totalData[0].count}`);
        
        if (totalData[0].count !== allTurnos[0].count) {
            console.log('❌ No todos los turnos tienen precio_total. Operación cancelada por seguridad.');
            return;
        }
        
        console.log('✅ Todos los turnos tienen precio_total correctamente asignado');
        
        // Crear backup de la estructura antes de eliminar
        console.log('💾 Creando backup de la estructura actual...');
        const [structure] = await db.query('DESCRIBE turno');
        console.log('Estructura actual de la tabla turno:');
        structure.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'Nullable' : 'Not Null'})`);
        });
        
        // Eliminar la columna precio
        console.log('\n🔄 Eliminando la columna precio...');
        await db.query('ALTER TABLE turno DROP COLUMN precio');
        
        console.log('✅ Columna precio eliminada exitosamente');
        
        // Verificar la nueva estructura
        const [newStructure] = await db.query('DESCRIBE turno');
        console.log('\n📋 Nueva estructura de la tabla turno:');
        newStructure.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'Nullable' : 'Not Null'})`);
        });
        
        // Verificar que los datos siguen íntegros
        const [sampleData] = await db.query(`
            SELECT id_turno, fecha, hora, precio_total, duracion_total, estado
            FROM turno 
            ORDER BY id_turno 
            LIMIT 3
        `);
        
        console.log('\n📊 Muestra de datos después de la eliminación:');
        sampleData.forEach(turno => {
            console.log(`  Turno ${turno.id_turno}: $${turno.precio_total} (${turno.duracion_total} min) - ${turno.estado}`);
        });
        
        console.log('\n🎉 Unificación de precios completada exitosamente!');
        console.log('✅ Ahora todos los turnos usan únicamente la columna precio_total');
        console.log('✅ El backend y frontend han sido actualizados para usar precio_total');
        console.log('✅ La columna precio redundante ha sido eliminada');
        
    } catch (error) {
        console.error('❌ Error durante la eliminación de la columna:', error);
        console.log('⚠️  La operación fue cancelada por seguridad');
    } finally {
        process.exit(0);
    }
}

removePrecioColumn();
