const db = require('./db');

async function checkComboTable() {
    try {
        console.log('🔍 Verificando estructura de la tabla combo...');
        
        const [result] = await db.query('DESCRIBE combo');
        console.log('\n📊 Estructura de la tabla combo:');
        result.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(Nullable)' : '(Not Null)'} ${col.Default !== null ? `Default: ${col.Default}` : ''}`);
        });
        
        // Verificar datos de ejemplo
        const [combos] = await db.query('SELECT * FROM combo LIMIT 3');
        console.log('\n📋 Muestra de combos existentes:');
        combos.forEach(combo => {
            console.log(`  ID: ${combo.id_combo}, Nombre: ${combo.nombre}, Descripción: "${combo.descripcion}", Precio: $${combo.precio_total}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

checkComboTable();
