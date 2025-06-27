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
                    
                    // Construir fecha/hora correctamente
                    const fechaStr = turno.fecha.split('T')[0]; // Solo la parte de fecha YYYY-MM-DD
                    const horaInicio = turno.hora_inicio || turno.hora;
                    const fechaHoraTurno = new Date(`${fechaStr}T${horaInicio}`);
                    
                    const ahora = new Date();
                    const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);
                    const puedeCancel = turno.estado === 'reservado' && diffHoras >= 48;
                    
                    console.log(`Turno ${turno.id_turno}: fecha=${fechaStr}, hora=${horaInicio}, diffHoras=${diffHoras.toFixed(1)}, puedeCancel=${puedeCancel}`);
                    
                    // Mostrar estado en español con badges coloridos
                    const estadoInfo = {
                        'disponible': { text: 'Disponible', class: 'success' },
                        'reservado': { text: 'Reservado', class: 'warning' },
                        'atendido': { text: 'Atendido', class: 'info' },
                        'cancelado': { text: 'Cancelado', class: 'secondary' },
                        'expirado': { text: 'Expirado', class: 'danger' },
                        'no_realizado': { text: 'No Realizado', class: 'danger' }
                    };
                    
                    const estadoData = estadoInfo[turno.estado] || { text: turno.estado, class: 'light' };

                    html += `<tr>
                        <td>${fechaFormateada}</td>
                        <td>${turno.hora_inicio || turno.hora} - ${turno.hora_fin || 'N/A'}</td>
                        <td>${turno.servicios || 'N/A'}</td>
                        <td>${turno.duracion_total || 0} min</td>
                        <td>$${Number(turno.precio_total || 0).toFixed(2)}</td>
                        <td><span class="badge badge-${estadoData.class}">${estadoData.text}</span></td>
                        <td>${turno.fecha_reserva ? new Date(turno.fecha_reserva).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td>${
                            turno.estado === 'reservado' 
                            ? (puedeCancel
                                ? `<button class="btn btn-cancel cancelar-turno-btn" data-id="${turno.id_turno}" data-fecha="${fechaStr}" data-hora="${horaInicio}">🚫 Cancelar</button>`
                                : diffHoras > 0 
                                ? `<span class="text-muted small">❌ No cancelable<br><small>(Solo ${Math.round(diffHoras * 10) / 10}h de anticipación)</small></span>`
                                : '<span class="text-danger small">⏰ Expirado</span>')
                            : turno.estado === 'cancelado'
                            ? '<span class="text-secondary">🚫 Cancelado</span>'
                            : turno.estado === 'atendido'
                            ? '<span class="text-success">✅ Completado</span>'
                            : ''
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
                        
                        if (confirm(`¿Seguro que deseas cancelar este turno del ${fecha} a las ${hora}?`)) {
                            const token = localStorage.getItem('token');
                            try {
                                const response = await fetch(`${API_BASE_URL}/turnos/cancelar/${idTurno}`, {
                                    method: 'PUT',
                                    headers: { 
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });
                                
                                const result = await response.json();
                                
                                if (response.ok) {
                                    let mensaje = result.mensaje || 'Turno cancelado correctamente';
                                    if (result.horasAnticipacion) {
                                        mensaje += `\n\nCancelado con ${result.horasAnticipacion} horas de anticipación.`;
                                    }
                                    alert(mensaje);
                                    cargarHistorialReservas();
                                } else {
                                    // Mostrar mensaje de error específico
                                    let errorMsg = result.error || 'No se pudo cancelar el turno';
                                    if (errorMsg.includes('48 horas')) {
                                        errorMsg = '⏰ Solo se pueden cancelar turnos con más de 48 horas de anticipación.';
                                        if (result.horasRestantes) {
                                            errorMsg += `\nTiempo restante: ${result.horasRestantes} horas.`;
                                        }
                                    }
                                    alert(errorMsg);
                                }
                            } catch (error) {
                                console.error('Error al cancelar turno:', error);
                                alert('Error de conexión al cancelar el turno');
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