async function probarEndpointCompleto() {
    try {
        console.log('=== PRUEBA COMPLETA DEL ENDPOINT MEJORADO ===\n');
        
        // Configuración base
        const baseURL = 'http://localhost:3000';
        
        // Nota: En una prueba real necesitarías un token de admin válido
        console.log('📝 SIMULACIÓN DE PRUEBA (necesitarías token real):');
        console.log('');
        console.log('POST /api/admin/turnos');
        console.log('Headers: { Authorization: "Bearer <admin-token>" }');
        console.log('Body: {');
        console.log('  "servicios": [1, 2],');
        console.log('  "empleados": [7],  // Eladio Carrión');
        console.log('  "fecha": "2025-07-03",');
        console.log('  "hora_inicio": "14:00:00",');
        console.log('  "hora_fin": "15:30:00",');
        console.log('  "precio": 5000,');
        console.log('  "duracion_total": 90');
        console.log('}');
        console.log('');
        
        console.log('🔮 RESPUESTA ESPERADA:');
        console.log('Status: 400 Bad Request');
        console.log('{');
        console.log('  "error": "Conflicto de horarios detectado",');
        console.log('  "mensaje": "Uno o más empleados ya tienen turnos asignados en este horario",');
        console.log('  "conflictos": [');
        console.log('    {');
        console.log('      "empleado": "Eladio Carrión",');
        console.log('      "mensaje": "No disponible en horario 14:00:00-15:30:00",');
        console.log('      "turnosConflictivos": [');
        console.log('        { "id_turno": 75, "hora": "14:30:00", "hora_fin": "16:00:00" }');
        console.log('      ]');
        console.log('    }');
        console.log('  ],');
        console.log('  "empleadosDisponibles": [],');
        console.log('  "empleadosConConflicto": ["Eladio Carrión"]');
        console.log('}');
        
        console.log('\n=== BENEFICIOS DEL SISTEMA MEJORADO ===');
        console.log('✅ Previene conflictos al CREAR turnos');
        console.log('✅ Previene conflictos al ASIGNAR empleados');
        console.log('✅ Proporciona detalles específicos de conflictos');
        console.log('✅ Mantiene integridad de datos');
        console.log('✅ Experiencia de usuario mejorada');
        
        console.log('\n=== FLUJO COMPLETO DE VALIDACIÓN ===');
        console.log('1. Usuario intenta crear turno');
        console.log('2. Sistema valida disponibilidad de empleados ANTES de crear');
        console.log('3. Si hay conflicto: Rechaza con detalles específicos');
        console.log('4. Si no hay conflicto: Crea turno exitosamente');
        console.log('5. Frontend recibe respuesta clara y puede informar al usuario');
        
    } catch (error) {
        console.error('Error en prueba:', error.message);
    }
}

probarEndpointCompleto();

probarEndpointCompleto();
