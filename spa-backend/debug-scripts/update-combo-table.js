const db = require('./db');

async function updateComboTable() {
    try {
        console.log('🔧 Modificando la tabla combo para permitir descripción opcional...');
        
        // Modificar la columna descripcion para permitir NULL
        await db.query('ALTER TABLE combo MODIFY COLUMN descripcion TEXT NULL');
        
        console.log('✅ Columna descripcion modificada exitosamente');
        
        // Verificar el cambio
        const [result] = await db.query('DESCRIBE combo');
        console.log('\n📊 Nueva estructura de la tabla combo:');
        result.forEach(col => {
            if (col.Field === 'descripcion') {
                console.log(`  ✅ ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(Nullable)' : '(Not Null)'}`);
            }
        });
        
        console.log('\n🎉 Ahora las descripciones de combos son opcionales');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

updateComboTable();
