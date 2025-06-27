const db = require('../db');

async function aplicarDescuentoTurno553() {
    try {
        console.log('💰 APLICANDO DESCUENTO AL TURNO 553');
        console.log('==================================');
        
        // Datos del descuento
        const precioOriginal = 110.00;
        const descuento = precioOriginal * 0.15; // 16.50
        const precioFinal = precioOriginal - descuento; // 93.50
        
        console.log(`Precio original: $${precioOriginal}`);
        console.log(`Descuento (15%): $${descuento.toFixed(2)}`);
        console.log(`Precio final: $${precioFinal.toFixed(2)}`);
        
        // Actualizar el turno
        await db.query(`
            UPDATE turno 
            SET precio_original = ?, descuento_aplicado = ?, precio_final = ?
            WHERE id_turno = 553
        `, [precioOriginal, descuento, precioFinal]);
        
        console.log('\n✅ Turno 553 actualizado con descuento');
        
        // Verificar el resultado
        const [turno] = await db.query('SELECT * FROM turno WHERE id_turno = 553');
        if (turno.length > 0) {
            const t = turno[0];
            console.log('\n🎯 Estado actualizado:');
            console.log(`  Precio original: $${t.precio_original}`);
            console.log(`  Descuento aplicado: $${t.descuento_aplicado}`);
            console.log(`  Precio final: $${t.precio_final}`);
            console.log(`  Método pago: ${t.metodo_pago}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

aplicarDescuentoTurno553();
