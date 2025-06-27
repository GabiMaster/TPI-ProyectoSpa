const db = require('../db');

async function fixDatabase() {
    try {
        console.log('🔧 VERIFICANDO Y ARREGLANDO BASE DE DATOS');
        console.log('=======================================');
        
        // Verificar estructura actual
        console.log('\n📊 Verificando estructura de tabla turno...');
        const [columns] = await db.query('DESCRIBE turno');
        
        const columnasExistentes = columns.map(col => col.Field);
        console.log('Columnas actuales:', columnasExistentes.join(', '));
        
        // Verificar columnas necesarias
        const columnasNecesarias = ['precio_original', 'descuento_aplicado', 'precio_final', 'metodo_pago'];
        const columnasFaltantes = columnasNecesarias.filter(col => !columnasExistentes.includes(col));
        
        if (columnasFaltantes.length === 0) {
            console.log('✅ Todas las columnas necesarias ya existen');
        } else {
            console.log('❌ Faltan columnas:', columnasFaltantes.join(', '));
            console.log('\n🔧 Agregando columnas...');
            
            for (const columna of columnasFaltantes) {
                let sql;
                switch(columna) {
                    case 'precio_original':
                        sql = 'ALTER TABLE turno ADD COLUMN precio_original DECIMAL(10,2) NULL';
                        break;
                    case 'descuento_aplicado':
                        sql = 'ALTER TABLE turno ADD COLUMN descuento_aplicado DECIMAL(10,2) DEFAULT 0';
                        break;
                    case 'precio_final':
                        sql = 'ALTER TABLE turno ADD COLUMN precio_final DECIMAL(10,2) NULL';
                        break;
                    case 'metodo_pago':
                        sql = 'ALTER TABLE turno ADD COLUMN metodo_pago VARCHAR(20) DEFAULT "efectivo"';
                        break;
                }
                
                try {
                    await db.query(sql);
                    console.log(`✅ Columna ${columna} agregada`);
                } catch (err) {
                    console.log(`❌ Error agregando ${columna}:`, err.message);
                }
            }
        }
        
        // Verificar turno 553
        console.log('\n🎯 Verificando turno 553...');
        const [turno553] = await db.query('SELECT * FROM turno WHERE id_turno = 553');
        
        if (turno553.length > 0) {
            const turno = turno553[0];
            console.log('Estado actual:');
            console.log('  ID:', turno.id_turno);
            console.log('  Estado:', turno.estado);
            console.log('  Cliente:', turno.id_cliente);
            console.log('  Precio total:', turno.precio_total);
            console.log('  Precio original:', turno.precio_original || 'NULL');
            console.log('  Descuento aplicado:', turno.descuento_aplicado || 'NULL');
            console.log('  Precio final:', turno.precio_final || 'NULL');
            console.log('  Método pago:', turno.metodo_pago || 'NULL');
            
            // Si el método de pago es débito pero no tiene descuento, aplicarlo
            if (turno.metodo_pago === 'debito' && (!turno.descuento_aplicado || turno.descuento_aplicado === 0)) {
                console.log('\n💡 Aplicando descuento retroactivo...');
                const precioOriginal = turno.precio_total;
                const descuento = precioOriginal * 0.15;
                const precioFinal = precioOriginal - descuento;
                
                await db.query(`
                    UPDATE turno 
                    SET precio_original = ?, descuento_aplicado = ?, precio_final = ?
                    WHERE id_turno = ?
                `, [precioOriginal, descuento, precioFinal, 553]);
                
                console.log(`✅ Descuento aplicado: $${descuento.toFixed(2)}`);
                console.log(`✅ Precio final: $${precioFinal.toFixed(2)}`);
            }
        } else {
            console.log('❌ Turno 553 no encontrado');
        }
        
        console.log('\n✅ Proceso completado');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixDatabase();
