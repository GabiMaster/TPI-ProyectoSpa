// TEST SIMPLE PARA EL PROBLEMA DE CONFIRMADOS
// Ejecutar en la consola del navegador después de loguearse como admin

async function debugConfirmados() {
    console.clear();
    console.log('🔍 DEBUG: Problema con turnos confirmados');
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ No hay token. Inicia sesión primero.');
        return;
    }
    
    try {
        // 1. Verificar turnos con estado "atendido" directamente
        const response = await fetch('http://localhost:3000/api/turnos/historial-completo?estado=atendido', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.error('❌ Error en la respuesta:', response.status);
            return;
        }
        
        const turnos = await response.json();
        console.log(`✅ Encontrados ${turnos.length} turnos con estado "atendido"`);
        
        if (turnos.length > 0) {
            console.table(turnos.map(t => ({
                ID: t.id_turno,
                Estado: t.estado,
                Fecha: t.fecha,
                Cliente: `${t.cliente_nombre || 'N/A'} ${t.cliente_apellido || ''}`
            })));
        } else {
            console.warn('⚠️ No hay turnos con estado "atendido" - El problema está en el backend');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
debugConfirmados();
