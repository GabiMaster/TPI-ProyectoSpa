const db = require('../db');

async function checkDBStructure() {
    try {
        console.log('🔍 VERIFICANDO ESTRUCTURA DE LA BASE DE DATOS');
        console.log('==============================================');
        
        // Verificar estructura de la tabla turno
        console.log('\n📊 ESTRUCTURA DE LA TABLA TURNO:');
        const [columns] = await db.query('DESCRIBE turno');
        
        columns.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
        });
        
        // Verificar si existen las columnas de descuento
        const columnsNeeded = ['precio_original', 'descuento_aplicado', 'precio_final', 'metodo_pago'];
        const existingColumns = columns.map(col => col.Field);
        
        console.log('\n✅ VERIFICACIÓN DE COLUMNAS NECESARIAS:');
        columnsNeeded.forEach(col => {
            const exists = existingColumns.includes(col);
            console.log(`  ${col}: ${exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);
        });
        
        // Si faltan columnas, sugerir como agregarlas
        const missingColumns = columnsNeeded.filter(col => !existingColumns.includes(col));
        if (missingColumns.length > 0) {
            console.log('\n🔧 COMANDOS PARA AGREGAR COLUMNAS FALTANTES:');
            missingColumns.forEach(col => {
                let sql;
                switch(col) {
                    case 'precio_original':
                        sql = 'ALTER TABLE turno ADD COLUMN precio_original DECIMAL(10,2) NULL;';
                        break;
                    case 'descuento_aplicado':
                        sql = 'ALTER TABLE turno ADD COLUMN descuento_aplicado DECIMAL(10,2) DEFAULT 0;';
                        break;
                    case 'precio_final':
                        sql = 'ALTER TABLE turno ADD COLUMN precio_final DECIMAL(10,2) NULL;';
                        break;
                    case 'metodo_pago':
                        sql = 'ALTER TABLE turno ADD COLUMN metodo_pago VARCHAR(20) DEFAULT "efectivo";';
                        break;
                }
                console.log(`  ${sql}`);
            });
            
            console.log('\n🔧 EJECUTANDO ALTERACIONES...');
            // Ejecutar las alteraciones automáticamente
            for (const col of missingColumns) {
                try {
                    let sql;
                    switch(col) {
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
                    await db.query(sql);
                    console.log(`  ✅ Columna ${col} agregada exitosamente`);
                } catch (alterError) {
                    console.log(`  ❌ Error agregando ${col}: ${alterError.message}`);
                }
            }
        }
        
        // Verificar algunos turnos de ejemplo
        console.log('\n🎯 EJEMPLO DE TURNOS ACTUALES:');
        const [turnos] = await db.query('SELECT * FROM turno ORDER BY id_turno DESC LIMIT 5');
        
        if (turnos.length > 0) {
            turnos.forEach(turno => {
                console.log(`\nTurno ID: ${turno.id_turno}`);
                console.log(`  Estado: ${turno.estado}`);
                console.log(`  Precio total: ${turno.precio_total}`);
                console.log(`  Precio original: ${turno.precio_original || 'NULL'}`);
                console.log(`  Descuento aplicado: ${turno.descuento_aplicado || 'NULL'}`);
                console.log(`  Precio final: ${turno.precio_final || 'NULL'}`);
                console.log(`  Método pago: ${turno.metodo_pago || 'NULL'}`);
            });
        } else {
            console.log('  No se encontraron turnos');
        }
        
        // Verificar específicamente el turno 553
        console.log('\n🎯 VERIFICANDO TURNO 553 ESPECÍFICAMENTE:');
        const [turno553] = await db.query('SELECT * FROM turno WHERE id_turno = 553');
        if (turno553.length > 0) {
            const t = turno553[0];
            console.log(`  ID: ${t.id_turno}`);
            console.log(`  Estado: ${t.estado}`);
            console.log(`  Cliente: ${t.id_cliente}`);
            console.log(`  Precio total: ${t.precio_total}`);
            console.log(`  Precio original: ${t.precio_original || 'NULL'}`);
            console.log(`  Descuento aplicado: ${t.descuento_aplicado || 'NULL'}`);
            console.log(`  Precio final: ${t.precio_final || 'NULL'}`);
            console.log(`  Método pago: ${t.metodo_pago || 'NULL'}`);
            console.log(`  Fecha: ${t.fecha}`);
            console.log(`  Hora: ${t.hora}`);
        } else {
            console.log('  ❌ Turno 553 no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkDBStructure();
