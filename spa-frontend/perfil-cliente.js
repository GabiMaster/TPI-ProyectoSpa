document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'cliente') {
            window.location.href = payload.role === 'admin' ? 'admin.html' : 'panel-empleado.html';
            return;
        }

        // Obtener datos del cliente
        const response = await fetch(`${API_BASE_URL}/clientes/${payload.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener datos');
        }

        const cliente = await response.json();
        
        // Mostrar datos
        document.getElementById('client-data').innerHTML = `
            <h2>Información Personal</h2>
            <p><strong>Nombre:</strong> ${cliente.nombre} ${cliente.apellido}</p>
            <p><strong>Email:</strong> ${cliente.email}</p>
            <p><strong>Teléfono:</strong> ${cliente.telefono || 'No especificado'}</p>
        `;

        // Cargar historial de reservas
        async function cargarHistorialReservas() {
            const token = localStorage.getItem('token');
            const historialDiv = document.getElementById('historial-reservas');
            try {
                const response = await fetch(`${API_BASE_URL}/turnos/historial`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'No se pudo obtener el historial');
                }
                const turnos = await response.json();

                if (turnos.length === 0) {
                    historialDiv.innerHTML = "<p>No tienes reservas registradas.</p>";
                    return;
                }

                let html = `<table class="historial-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Servicios</th>
                            <th>Duración</th>
                            <th>Precio</th>
                            <th>Estado</th>
                            <th>Fecha Reserva</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                `;
                turnos.forEach(turno => {
                    const fecha = new Date(turno.fecha);
                    const fechaFormateada = fecha.toLocaleDateString('es-ES');
                    
                    // Calcular si han pasado más de 48 horas desde ahora hasta el turno
                    const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora_inicio}`);
                    const ahora = new Date();
                    const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);
                    const puedeCancel = turno.estado === 'reservado' && diffHoras > 48;
                    
                    // Mostrar estado en español
                    const estadoTexto = {
                        'disponible': 'Disponible',
                        'reservado': 'Reservado',
                        'atendido': 'Atendido',
                        'cancelado': 'Cancelado',
                        'expirado': 'Expirado',
                        'no_realizado': 'No Realizado'
                    };

                    html += `<tr>
                        <td>${fechaFormateada}</td>
                        <td>${turno.hora_inicio} - ${turno.hora_fin}</td>
                        <td>${turno.servicios || 'N/A'}</td>
                        <td>${turno.duracion_total || 0} min</td>
                        <td>$${Number(turno.precio_total || 0).toFixed(2)}</td>
                        <td><span class="estado-badge estado-${turno.estado}">${estadoTexto[turno.estado] || turno.estado}</span></td>
                        <td>${turno.fecha_reserva ? new Date(turno.fecha_reserva).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td>${
                            puedeCancel
                            ? `<button class="cancelar-turno-btn" data-id="${turno.id_turno}" data-fecha="${turno.fecha}" data-hora="${turno.hora_inicio}">Cancelar</button>`
                            : (turno.estado === 'reservado' && diffHoras <= 48 && diffHoras > 0 
                                ? '<span class="no-cancel-text">No cancelable (menos de 48h)</span>'
                                : '')
                        }</td>
                    </tr>`;
                });
                html += "</tbody></table>";
                historialDiv.innerHTML = html;

                // Asignar evento a los botones de cancelar
                document.querySelectorAll('.cancelar-turno-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const idTurno = btn.dataset.id;
                        const fecha = btn.dataset.fecha;
                        const hora = btn.dataset.hora;
                        
                        if (confirm('¿Seguro que deseas cancelar este turno?')) {
                            // Doble validación de 48 horas
                            const fechaHoraTurno = new Date(`${fecha}T${hora}`);
                            const ahora = new Date();
                            const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);
                            
                            if (diffHoras <= 48) {
                                alert("No puedes cancelar el turno con menos de 48 horas de anticipación.");
                                return;
                            }
                            
                            const token = localStorage.getItem('token');
                            const response = await fetch(`${API_BASE_URL}/turnos/cancelar/${idTurno}`, {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                alert(result.message || 'Turno cancelado correctamente');
                                cargarHistorialReservas();
                            } else {
                                const error = await response.json();
                                alert(error.error || 'No se pudo cancelar el turno');
                            }
                        }
                    });
                });
                
            } catch (error) {
                historialDiv.innerHTML = `<p style="color:red">Error al cargar el historial: ${error.message}</p>`;
                console.error('Error:', error);
            }
        }

        cargarHistorialReservas();

        // Logout
        document.getElementById('logout-button').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los datos');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});