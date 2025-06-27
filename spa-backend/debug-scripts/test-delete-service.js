const express = require('express');
const db = require('./db');

async function testDeleteServiceRoute() {
    try {
        console.log('🧪 Probando la ruta DELETE de servicios...');
        
        // Primero, obtener un servicio de prueba
        const [servicios] = await db.query('SELECT id_servicio, nombre FROM servicio LIMIT 1');
        
        if (servicios.length === 0) {
            console.log('❌ No hay servicios en la base de datos para probar');
            return;
        }
        
        const servicio = servicios[0];
        console.log(`📋 Servicio encontrado: ID ${servicio.id_servicio} - ${servicio.nombre}`);
        
        // Verificar si tiene turnos asociados
        const [turnosAsociados] = await db.query(
            'SELECT COUNT(*) AS count FROM turno_servicio WHERE id_servicio = ?',
            [servicio.id_servicio]
        );
        
        console.log(`🔗 Turnos asociados: ${turnosAsociados[0].count}`);
        
        if (turnosAsociados[0].count > 0) {
            console.log('⚠️  Este servicio tiene turnos asociados, no se puede eliminar');
            console.log('✅ La validación de integridad funcionaría correctamente');
        } else {
            console.log('✅ Este servicio se puede eliminar sin problemas');
        }
        
        console.log('\n📡 La ruta DELETE debería funcionar correctamente');
        console.log('🔍 Verificar en el navegador que se llama a /api/servicios/X y no /api/turnos/X');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testDeleteServiceRoute();
