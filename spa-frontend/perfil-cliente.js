document.addEventListener('DOMContentLoaded', async () => {
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
        const response = await fetch(`https://9plm87v2-3000.brs.devtunnels.ms/api/clientes/${payload.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al obtener datos');

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
                const response = await fetch('https://9plm87v2-3000.brs.devtunnels.ms/api/turnos/historial', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('No se pudo obtener el historial');
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
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                `;
                turnos.forEach(turno => {
                    const fecha = new Date(turno.fecha);
                    const fechaFormateada = `${fecha.getFullYear()}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${String(fecha.getDate()).padStart(2, '0')}`;
                    const esFuturo = fecha > new Date() || (fecha.toDateString() === new Date().toDateString() && turno.hora > new Date().toLocaleTimeString('it-IT', { hour12: false }).slice(0,5));
                    html += `<tr>
                        <td>${fechaFormateada}</td>
                        <td>${turno.hora.slice(0,5)}</td>
                        <td>${turno.servicios}</td>
                        <td>${turno.duracion_total} min</td>
                        <td>$${Number(turno.precio_total).toFixed(2)}</td>
                        <td>${turno.estado}</td>
                        <td>${
                            (turno.estado !== 'cancelado' && esFuturo)
                            ? `<button class="cancelar-turno-btn" data-id="${turno.id_turno}">Cancelar</button>`
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
                        if (confirm('¿Seguro que deseas cancelar este turno?')) {
                            // Buscar el turno correspondiente
                            const turno = turnos.find(t => t.id_turno == idTurno);
                            // Validación de 24 horas
                            const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora}`);
                            const ahora = new Date();
                            const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);
                            if (diffHoras < 24) {
                                alert("No puedes cancelar el turno con menos de 24 horas de anticipación. Se cobrará el turno.");
                                return;
                            }
                            const token = localStorage.getItem('token');
                            const response = await fetch(`https://9plm87v2-3000.brs.devtunnels.ms/api/turnos/cancelar/${idTurno}`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (response.ok) {
                                alert('Turno cancelado correctamente');
                                cargarHistorialReservas();
                            } else {
                                alert('No se pudo cancelar el turno');
                            }
                        }
                    });
                });
                
            } catch (error) {
                historialDiv.innerHTML = `<p>Error al cargar el historial</p>`;
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