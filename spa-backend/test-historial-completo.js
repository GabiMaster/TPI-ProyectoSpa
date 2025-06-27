const axios = require('axios');

async function probarHistorialCompleto() {
    try {
        // Primero necesitamos obtener un token de admin
        const adminData = {
            email: 'admin@spa.com',
            password: 'admin123'
        };
        
        console.log('Obteniendo token de admin...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', adminData);
        const token = loginResponse.data.token;
        
        console.log('Token obtenido exitosamente\n');
        
        // Probar historial completo sin filtro
        console.log('=== Historial completo (todos) ===');
        const historialTodos = await axios.get('http://localhost:3000/api/turnos/historial-completo', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Total de turnos: ${historialTodos.data.length}`);
        const estadosEncontrados = [...new Set(historialTodos.data.map(t => t.estado))];
        console.log('Estados encontrados:', estadosEncontrados);
        
        // Filtrar localmente por atendido para verificar
        const turnosAtendidos = historialTodos.data.filter(t => t.estado === 'atendido');
        console.log(`Turnos atendidos encontrados: ${turnosAtendidos.length}`);
        if (turnosAtendidos.length > 0) {
            console.table(turnosAtendidos.map(t => ({
                id: t.id_turno,
                estado: t.estado,
                fecha: t.fecha,
                hora: t.hora_inicio,
                cliente: `${t.cliente_nombre} ${t.cliente_apellido}`
            })));
        }
        
        // Probar historial filtrado por estado "atendido"
        console.log('\n=== Historial filtrado por "atendido" ===');
        const historialAtendidos = await axios.get('http://localhost:3000/api/turnos/historial-completo?estado=atendido', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Turnos filtrados por atendido: ${historialAtendidos.data.length}`);
        if (historialAtendidos.data.length > 0) {
            console.table(historialAtendidos.data.map(t => ({
                id: t.id_turno,
                estado: t.estado,
                fecha: t.fecha,
                hora: t.hora_inicio,
                cliente: `${t.cliente_nombre} ${t.cliente_apellido}`
            })));
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

probarHistorialCompleto();
