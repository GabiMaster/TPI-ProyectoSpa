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

        // ==================== GESTIÓN DE TARJETAS DE DÉBITO ====================
        
        // Cargar información de tarjeta
        async function cargarTarjeta() {
            const tarjetaInfo = document.getElementById('tarjeta-info');
            const agregarBtn = document.getElementById('agregar-tarjeta');
            const editarBtn = document.getElementById('editar-tarjeta');
            const eliminarBtn = document.getElementById('eliminar-tarjeta');

            try {
                // Intentar cargar desde el servidor primero
                const response = await fetch(`${API_BASE_URL}/clientes/${payload.id}/tarjeta`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.tarjeta) {
                        tarjetaInfo.innerHTML = `
                            <div class="tarjeta-card">
                                <p><strong>Tarjeta de Débito:</strong> ${data.tarjeta.numero_tarjeta}</p>
                                <p><strong>Titular:</strong> ${data.tarjeta.titular}</p>
                                <p><strong>Vencimiento:</strong> ${data.tarjeta.vencimiento}</p>
                                <p><strong>DNI:</strong> ${data.tarjeta.dni_titular}</p>
                                <p class="tarjeta-fecha"><small>Agregada: ${new Date(data.tarjeta.fecha_creacion).toLocaleDateString()}</small></p>
                            </div>
                        `;
                        agregarBtn.style.display = 'none';
                        editarBtn.style.display = 'inline-block';
                        eliminarBtn.style.display = 'inline-block';
                        return;
                    }
                }

                // Si no se puede cargar del servidor, intentar localStorage como respaldo
                console.log('ℹ️ Usando respaldo localStorage para tarjetas');
                const tarjetaLocal = localStorage.getItem(`tarjeta_${payload.id}`);
                
                if (tarjetaLocal) {
                    const tarjeta = JSON.parse(tarjetaLocal);
                    tarjetaInfo.innerHTML = `
                        <div class="tarjeta-card">
                            <p><strong>Tarjeta de Débito:</strong> **** **** **** ${tarjeta.numero.slice(-4)}</p>
                            <p><strong>Titular:</strong> ${tarjeta.titular}</p>
                            <p><strong>Vencimiento:</strong> ${tarjeta.vencimiento}</p>
                            <p><strong>DNI:</strong> ${tarjeta.dni_titular}</p>
                            <p class="tarjeta-fecha"><small>Guardada localmente</small></p>
                        </div>
                    `;
                    agregarBtn.style.display = 'none';
                    editarBtn.style.display = 'inline-block';
                    eliminarBtn.style.display = 'inline-block';
                } else {
                    tarjetaInfo.innerHTML = '<p class="no-tarjeta">No tienes ninguna tarjeta guardada</p>';
                    agregarBtn.style.display = 'inline-block';
                    editarBtn.style.display = 'none';
                    eliminarBtn.style.display = 'none';
                }
            } catch (error) {
                console.error('Error al cargar tarjeta:', error);
                // Fallback a localStorage
                const tarjetaLocal = localStorage.getItem(`tarjeta_${payload.id}`);
                if (tarjetaLocal) {
                    const tarjeta = JSON.parse(tarjetaLocal);
                    tarjetaInfo.innerHTML = `
                        <div class="tarjeta-card">
                            <p><strong>Tarjeta de Débito:</strong> **** **** **** ${tarjeta.numero.slice(-4)}</p>
                            <p><strong>Titular:</strong> ${tarjeta.titular}</p>
                            <p><strong>Vencimiento:</strong> ${tarjeta.vencimiento}</p>
                            <p><strong>DNI:</strong> ${tarjeta.dni_titular}</p>
                            <p class="tarjeta-fecha"><small>Guardada localmente</small></p>
                        </div>
                    `;
                    agregarBtn.style.display = 'none';
                    editarBtn.style.display = 'inline-block';
                    eliminarBtn.style.display = 'inline-block';
                } else {
                    tarjetaInfo.innerHTML = '<p class="no-tarjeta">No tienes ninguna tarjeta guardada</p>';
                    agregarBtn.style.display = 'inline-block';
                    editarBtn.style.display = 'none';
                    eliminarBtn.style.display = 'none';
                }
            }
        }

        // Mostrar formulario de tarjeta
        function mostrarFormularioTarjeta(editar = false) {
            const popup = document.getElementById('tarjeta-popup') || crearPopupTarjeta();
            const form = document.getElementById('tarjeta-form');
            const titulo = popup.querySelector('h3');

            titulo.textContent = editar ? 'Editar Tarjeta de Débito' : 'Agregar Tarjeta de Débito';
            
            if (editar) {
                // Si es edición, podrías prellenar algunos campos si es necesario
                form.querySelector('#guardar-tarjeta').parentElement.style.display = 'none';
            } else {
                form.querySelector('#guardar-tarjeta').parentElement.style.display = 'none'; // En perfil no necesitamos el checkbox
            }

            popup.classList.remove('hidden');
        }

        // Crear popup de tarjeta si no existe
        function crearPopupTarjeta() {
            const popup = document.createElement('div');
            popup.id = 'tarjeta-popup';
            popup.className = 'popup hidden';
            popup.innerHTML = `
                <div class="popup-content">
                    <h3>Agregar Tarjeta de Débito</h3>
                    <form id="tarjeta-form">
                        <div class="form-group">
                            <label for="numero-tarjeta">Número de Tarjeta:</label>
                            <input type="text" id="numero-tarjeta" name="numero-tarjeta" placeholder="1234 5678 9012 3456" maxlength="19" required>
                        </div>
                        <div class="form-group">
                            <label for="nombre-titular">Nombre del Titular:</label>
                            <input type="text" id="nombre-titular" name="nombre-titular" placeholder="NOMBRE APELLIDO" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="vencimiento">Vencimiento:</label>
                                <input type="text" id="vencimiento" name="vencimiento" placeholder="MM/AA" maxlength="5" required>
                            </div>
                            <div class="form-group">
                                <label for="cvv">CVV:</label>
                                <input type="text" id="cvv" name="cvv" placeholder="123" maxlength="3" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="dni-titular">DNI del Titular:</label>
                            <input type="text" id="dni-titular" name="dni-titular" placeholder="12345678" required>
                        </div>
                        <div class="form-group checkbox-group" style="display:none;">
                            <label class="checkbox-label">
                                <input type="checkbox" id="guardar-tarjeta" name="guardar-tarjeta">
                                Guardar esta tarjeta en mi perfil para futuros pagos
                            </label>
                        </div>
                        <div class="popup-actions">
                            <button type="button" id="cancelar-tarjeta" class="popup-btn secondary">Cancelar</button>
                            <button type="submit" id="confirmar-tarjeta" class="popup-btn primary">Confirmar</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(popup);

            // Configurar event listeners para formateo
            const numeroTarjeta = popup.querySelector('#numero-tarjeta');
            numeroTarjeta.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                let formattedInputValue = value.match(/.{1,4}/g)?.join(' ') || value;
                if (formattedInputValue.length > 19) formattedInputValue = formattedInputValue.substr(0, 19);
                e.target.value = formattedInputValue;
            });

            const vencimiento = popup.querySelector('#vencimiento');
            vencimiento.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });

            const cvv = popup.querySelector('#cvv');
            cvv.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
            });

            const dniTitular = popup.querySelector('#dni-titular');
            dniTitular.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 8);
            });

            // Evento cancelar
            popup.querySelector('#cancelar-tarjeta').addEventListener('click', () => {
                popup.classList.add('hidden');
                popup.querySelector('#tarjeta-form').reset();
            });

            // Cerrar con ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !popup.classList.contains('hidden')) {
                    popup.classList.add('hidden');
                    popup.querySelector('#tarjeta-form').reset();
                }
            });

            // Cerrar haciendo clic fuera
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    popup.classList.add('hidden');
                    popup.querySelector('#tarjeta-form').reset();
                }
            });

            return popup;
        }

        // Guardar tarjeta
        async function guardarTarjeta(datosTarjeta) {
            try {
                // Intentar guardar en el servidor primero
                const response = await fetch(`${API_BASE_URL}/clientes/${payload.id}/tarjeta`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        numero_tarjeta: datosTarjeta.numero,
                        titular: datosTarjeta.titular,
                        vencimiento: datosTarjeta.vencimiento,
                        dni_titular: datosTarjeta.dni_titular
                    })
                });

                if (response.ok) {
                    alert('Tarjeta guardada exitosamente en el servidor');
                    await cargarTarjeta();
                    return;
                }

                // Si falla el servidor, guardar localmente
                console.log('ℹ️ Servidor no disponible, guardando localmente');
                const tarjetaParaGuardar = {
                    numero: datosTarjeta.numero,
                    titular: datosTarjeta.titular,
                    vencimiento: datosTarjeta.vencimiento,
                    dni_titular: datosTarjeta.dni_titular,
                    fecha_creacion: new Date().toISOString()
                };
                
                localStorage.setItem(`tarjeta_${payload.id}`, JSON.stringify(tarjetaParaGuardar));
                alert('Tarjeta guardada localmente (se sincronizará cuando el servidor esté disponible)');
                await cargarTarjeta();
                
            } catch (error) {
                console.error('Error al guardar tarjeta:', error);
                
                // Respaldo: guardar en localStorage
                const tarjetaParaGuardar = {
                    numero: datosTarjeta.numero,
                    titular: datosTarjeta.titular,
                    vencimiento: datosTarjeta.vencimiento,
                    dni_titular: datosTarjeta.dni_titular,
                    fecha_creacion: new Date().toISOString()
                };
                
                localStorage.setItem(`tarjeta_${payload.id}`, JSON.stringify(tarjetaParaGuardar));
                alert('Error del servidor. Tarjeta guardada localmente.');
                await cargarTarjeta();
            }
        }

        // Eliminar tarjeta
        async function eliminarTarjeta() {
            if (!confirm('¿Estás seguro de que quieres eliminar tu tarjeta de débito?')) {
                return;
            }

            try {
                // Intentar eliminar del servidor primero
                const response = await fetch(`${API_BASE_URL}/clientes/${payload.id}/tarjeta`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    alert('Tarjeta eliminada del servidor exitosamente');
                } else {
                    console.log('ℹ️ No se pudo eliminar del servidor, eliminando localmente');
                }
                
                // Eliminar también de localStorage por si acaso
                localStorage.removeItem(`tarjeta_${payload.id}`);
                await cargarTarjeta();
                
            } catch (error) {
                console.error('Error al eliminar tarjeta:', error);
                // Eliminar de localStorage como respaldo
                localStorage.removeItem(`tarjeta_${payload.id}`);
                alert('Tarjeta eliminada localmente');
                await cargarTarjeta();
            }
        }

        // Validar datos de tarjeta
        function validarTarjeta(datos) {
            const errors = [];

            if (!datos.numero || datos.numero.length !== 16) {
                errors.push('El número de tarjeta debe tener 16 dígitos');
            }

            if (!datos.titular || datos.titular.length < 3) {
                errors.push('El nombre del titular es requerido');
            }

            if (!datos.vencimiento || !datos.vencimiento.match(/^\d{2}\/\d{2}$/)) {
                errors.push('El vencimiento debe tener formato MM/AA');
            }

            if (!datos.cvv || datos.cvv.length !== 3) {
                errors.push('El CVV debe tener 3 dígitos');
            }

            if (!datos.dni_titular || datos.dni_titular.length < 7) {
                errors.push('El DNI del titular es requerido');
            }

            if (errors.length > 0) {
                alert(errors.join('\n'));
                return false;
            }

            return true;
        }

        // Event listeners para botones de tarjeta
        document.getElementById('agregar-tarjeta').addEventListener('click', () => {
            mostrarFormularioTarjeta(false);
        });

        document.getElementById('editar-tarjeta').addEventListener('click', () => {
            mostrarFormularioTarjeta(true);
        });

        document.getElementById('eliminar-tarjeta').addEventListener('click', eliminarTarjeta);

        // Event listener para envío del formulario de tarjeta
        document.addEventListener('submit', async (e) => {
            if (e.target.id === 'tarjeta-form') {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const datosTarjeta = {
                    numero: formData.get('numero-tarjeta').replace(/\s/g, ''),
                    titular: formData.get('nombre-titular'),
                    vencimiento: formData.get('vencimiento'),
                    cvv: formData.get('cvv'),
                    dni_titular: formData.get('dni-titular')
                };

                if (validarTarjeta(datosTarjeta)) {
                    const popup = document.getElementById('tarjeta-popup');
                    popup.classList.add('hidden');
                    e.target.reset();
                    await guardarTarjeta(datosTarjeta);
                }
            }
        });

        // Logout
        document.getElementById('logout-button').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });

        // Cargar datos iniciales
        await cargarTarjeta();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los datos');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});