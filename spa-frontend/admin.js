document.addEventListener("DOMContentLoaded", () => {
    console.log('🚀 ADMIN.JS RECARGADO - Timestamp:', new Date().toISOString());
    
    // Configuración base
    const API_BASE_URL = 'http://localhost:3000/api';
    const API_ADMIN_BASE_URL = `${API_BASE_URL}/admin`;
    const token = localStorage.getItem("token");

    // Verificación de token y rol
    if (!token) {
        alert("No tienes permiso para acceder a esta página.");
        window.location.href = "login.html";
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload || payload.role !== 'admin') {
            throw new Error("Acceso no autorizado");
        }
    } catch (error) {
        alert("Error de autenticación: " + error.message);
        window.location.href = "login.html";
        return;
    }

    // ==================== FUNCIONES AUXILIARES ====================
    const toggleVisibility = (element, show) => {
        element.classList.toggle("hidden", !show);
    };

    const resetForm = (form) => {
        form.reset();
        form.dataset.action = "";
        form.dataset.id = "";
    };

    const showAlert = (message, isError = false, details = null) => {
        showNotification(message, isError ? 'error' : 'success', details);
    };

    // Sistema de notificaciones mejorado
    const showNotification = (message, type = 'info', details = null) => {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '?',
            error: '❌',
            warning: '⚠️',
            conflict: '⚡',
            info: 'ℹ️'
        };

        const titles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            conflict: 'Conflicto de Horarios',
            info: 'Información'
        };

        let detailsHtml = '';
        if (details && type === 'conflict') {
            detailsHtml = `
                <div class="notification-details">
                    <h4>Empleados con conflictos:</h4>
                    ${details.conflictos?.map(conflicto => `
                        <div class="conflict-employee">
                            <div class="conflict-employee-name">${conflicto.empleado}</div>
                            <div class="conflict-turns">
                                Horario solicitado: ${details.horaInicio || 'N/A'} - ${details.horaFin || 'N/A'}
                            </div>
                            ${conflicto.turnosConflictivos?.map(turno => `
                                <div class="conflict-turn">
                                    Turno ${turno.id_turno}: ${turno.hora} - ${turno.hora_fin} (${turno.estado})
                                </div>
                            `).join('') || ''}
                        </div>
                    `).join('') || ''}
                </div>
            `;
        }

        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-icon">${icons[type]}</div>
                <div class="notification-title">${titles[type]}</div>
                <button class="notification-close" onclick="this.closest('.notification').remove()">×</button>
            </div>
            <div class="notification-message">${message}</div>
            ${detailsHtml}
        `;

        container.appendChild(notification);

        // Mostrar animación
        setTimeout(() => notification.classList.add('show'), 100);

        // Auto-remover después de un tiempo (más tiempo para errores)
        const autoRemoveTime = type === 'error' || type === 'conflict' ? 8000 : 4000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, autoRemoveTime);
    };

    const handleFetchError = async (response) => {
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error ${response.status} en ${response.url}:`, errorText);
            try {
                const errorData = JSON.parse(errorText);
                const errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`;
                
                // Mensajes de error más específicos
                if (response.status === 404) {
                    throw new Error(`Endpoint no encontrado: ${response.url}`);
                } else if (response.status === 401) {
                    throw new Error('Error de autenticación - Token inválido o expirado');
                } else if (response.status === 403) {
                    throw new Error('No tienes permisos para realizar esta acción');
                } else if (response.status === 500) {
                    throw new Error(`Error interno del servidor: ${errorMessage}`);
                } else {
                    throw new Error(errorMessage);
                }
            } catch (parseError) {
                if (parseError instanceof SyntaxError) {
                    throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
                } else {
                    throw parseError;
                }
            }
        }
        return response.json();
    };

    // ==================== FUNCIONES AUXILIARES ====================
    
    // Función para calcular precio sugerido basado en duración
    function calcularPrecioSugerido(servicios) {
        if (!servicios || servicios.length === 0) return 0;
        
        // Precio base por minuto (puedes ajustar este valor)
        const precioPorMinuto = 1.5; // $1.5 por minuto
        
        let duracionTotal = 0;
        servicios.forEach(servicio => {
            duracionTotal += servicio.duracion || 0;
        });
        
        // Calcular precio base
        let precioSugerido = duracionTotal * precioPorMinuto;
        
        // Aplicar descuento por múltiples servicios
        if (servicios.length > 1) {
            precioSugerido *= 0.9; // 10% de descuento por combo
        }
        
        // Redondear a múltiplos de 5 para precios más "amigables"
        precioSugerido = Math.round(precioSugerido / 5) * 5;
        
        console.log(`💰 Precio sugerido calculado: ${duracionTotal} min × $${precioPorMinuto} = $${precioSugerido}`);
        return precioSugerido;
    }
    
    // Función para actualizar el precio sugerido en el formulario de turnos
    function actualizarPrecioSugerido() {
        const precioInput = document.getElementById('turno-precio');
        if (precioInput && serviciosSeleccionados.length > 0) {
            const precioSugerido = calcularPrecioSugerido(serviciosSeleccionados);
            
            // Solo actualizar si el campo está vacío o tiene valor 0
            if (!precioInput.value || precioInput.value === '0') {
                precioInput.value = precioSugerido;
                console.log(`💡 Precio sugerido actualizado: $${precioSugerido}`);
            }
        }
    }

    // ==================== GESTIÓN DE SERVICIOS ====================
    const serviceFormContainer = document.getElementById("service-form-container");
    const serviceForm = document.getElementById("service-form");
    const formTitle = document.getElementById("service-form-title");

    document.getElementById("add-service").addEventListener("click", () => {
        formTitle.textContent = "Añadir Servicio";
        serviceForm.dataset.action = "add";
        resetForm(serviceForm);
        toggleVisibility(serviceFormContainer, true);
    });

    document.getElementById("edit-service").addEventListener("click", async () => {
        const serviceId = prompt("Ingrese el ID del servicio que desea editar:");
        if (!serviceId || isNaN(serviceId)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/servicios/${serviceId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const serviceData = await handleFetchError(response);

            formTitle.textContent = "Editar Servicio";
            serviceForm.dataset.action = "edit";
            serviceForm.dataset.serviceId = serviceId;
            document.getElementById("nombre").value = serviceData.nombre;
            document.getElementById("descripcion").value = serviceData.descripcion || "";
            document.getElementById("duracion").value = serviceData.duracion;
            document.getElementById("categoria").value = serviceData.categoria;
            toggleVisibility(serviceFormContainer, true);
        } catch (error) {
            showAlert("Error al obtener servicio: " + error.message, true);
            console.error(error);
        }
    });

    serviceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = Object.fromEntries(new FormData(e.target));
            const action = serviceForm.dataset.action;
            let endpoint = `${API_BASE_URL}/servicios`;
            let method = "POST";
            if (action === "edit") {
                endpoint = `${API_BASE_URL}/servicios/${serviceForm.dataset.serviceId}`;
                method = "PUT";
            }
            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const result = await handleFetchError(response);
            showAlert(result.message || "Operación exitosa");
            toggleVisibility(serviceFormContainer, false);
        } catch (error) {
            showAlert("Error: " + error.message, true);
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    });

    document.getElementById("delete-service").addEventListener("click", async () => {
        const serviceId = prompt("Ingrese el ID del servicio a eliminar:");
        if (!serviceId || isNaN(serviceId)) return;

        if (confirm(`¿Eliminar servicio ID ${serviceId}?`)) {
            try {
                const deleteUrl = `${API_BASE_URL}/servicios/${serviceId}`;
                console.log('🗑️ Eliminando servicio:', deleteUrl);
                
                const response = await fetch(deleteUrl, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await handleFetchError(response);
                showAlert(result.message || "Servicio eliminado exitosamente");
            } catch (error) {
                showAlert("Error al eliminar: " + error.message, true);
                console.error('❌ Error completo:', error);
            }
        }
    });

    document.getElementById("cancel-service")?.addEventListener("click", () => {
        toggleVisibility(serviceFormContainer, false);
    });

    // ==================== GESTIÓN DE COMBOS ====================
    const comboFormContainer = document.getElementById("combo-form-container");
    const comboForm = document.getElementById("combo-form");
    const comboFormTitle = document.getElementById("combo-form-title");

    document.getElementById("add-combo").addEventListener("click", () => {
        comboFormTitle.textContent = "Añadir Combo";
        comboForm.dataset.action = "add";
        resetForm(comboForm);
        // Limpiar servicios seleccionados
        serviciosComboSeleccionados = [];
        document.getElementById('servicios-combo-seleccionados').innerHTML = '<p class="no-selection">No hay servicios seleccionados</p>';
        toggleVisibility(comboFormContainer, true);
    });

    document.getElementById("edit-combo").addEventListener("click", async () => {
        const comboId = prompt("Ingrese el ID del combo que desea editar:");
        if (!comboId || isNaN(comboId)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/combos/${comboId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const comboData = await handleFetchError(response);

            comboFormTitle.textContent = "Editar Combo";
            comboForm.dataset.action = "edit";
            comboForm.dataset.comboId = comboId;
            document.getElementById("combo-nombre").value = comboData.nombre;
            document.getElementById("combo-descripcion").value = comboData.descripcion || "";
            document.getElementById("combo-precio").value = comboData.precio_total;
            
            // Cargar servicios seleccionados del combo
            serviciosComboSeleccionados = comboData.servicios ? comboData.servicios.map(s => s.id_servicio) : [];
            
            // Actualizar visualización de servicios seleccionados
            const container = document.getElementById('servicios-combo-seleccionados');
            if (serviciosComboSeleccionados.length > 0 && comboData.servicios) {
                container.innerHTML = `
                    <div class="servicios-seleccionados">
                        <h5>Servicios seleccionados:</h5>
                        ${comboData.servicios.map(servicio => `
                            <span class="servicio-tag">${servicio.nombre} (${servicio.duracion} min)</span>
                        `).join('')}
                    </div>
                `;
            } else {
                container.innerHTML = '<p class="no-selection">No hay servicios seleccionados</p>';
            }
            
            toggleVisibility(comboFormContainer, true);
        } catch (error) {
            showAlert("Error al obtener combo: " + error.message, true);
            console.error(error);
        }
    });

    comboForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = new FormData(e.target);
            
            // Transformar los datos al formato esperado por el backend
            const data = {
                nombre: formData.get('combo-nombre'),
                descripcion: formData.get('combo-descripcion'),
                precio_total: parseFloat(formData.get('combo-precio')),
                servicios: serviciosComboSeleccionados
            };

            // Validar que hay servicios seleccionados
            if (data.servicios.length === 0) {
                throw new Error('Debe seleccionar al menos un servicio para el combo');
            }

            const action = comboForm.dataset.action;
            let endpoint = `${API_BASE_URL}/combos`;
            let method = "POST";
            if (action === "edit") {
                endpoint = `${API_BASE_URL}/combos/${comboForm.dataset.comboId}`;
                method = "PUT";
            }
            
            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await handleFetchError(response);
            showAlert(result.message || "Combo guardado exitosamente");
            toggleVisibility(comboFormContainer, false);
            resetForm(comboForm);
            // Limpiar servicios seleccionados
            serviciosComboSeleccionados = [];
            document.getElementById('servicios-combo-seleccionados').innerHTML = '';
        } catch (error) {
            showAlert("Error: " + error.message, true);
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    });

    document.getElementById("delete-combo")?.addEventListener("click", async () => {
        const comboId = prompt("Ingrese el ID del combo a eliminar:");
        if (!comboId || isNaN(comboId)) return;

        if (confirm(`¿Eliminar combo ID ${comboId}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/combos/${comboId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await handleFetchError(response);
                showAlert(result.message || "Combo eliminado exitosamente");
            } catch (error) {
                showAlert("Error al eliminar combo: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-combo")?.addEventListener("click", () => {
        toggleVisibility(comboFormContainer, false);
        resetForm(comboForm);
        // Limpiar servicios seleccionados
        serviciosComboSeleccionados = [];
        document.getElementById('servicios-combo-seleccionados').innerHTML = '';
    });

    // ==================== GESTIÓN DE TURNOS ====================
    const turnoFormContainer = document.getElementById("turno-form-container");
    const turnoForm = document.getElementById("turno-form");
    const addTurnoBtn = document.getElementById("add-turno");
    const editTurnoBtn = document.getElementById("edit-turno");
    const deleteTurnoBtn = document.getElementById("delete-turno");

    // Variable global para servicios seleccionados - almacenar objetos completos
    let serviciosSeleccionados = [];
    let serviciosDisponibles = []; // Cache de todos los servicios disponibles

    // Popup de selección de servicios
    document.getElementById('btn-seleccionar-servicios').addEventListener('click', async () => {
        try {
            document.getElementById('servicios-popup').classList.remove('hidden');
            const res = await fetch(`${API_BASE_URL}/servicios`, { headers: { "Authorization": `Bearer ${token}` } });
            const servicios = await res.json();

            // Guardar cache de servicios disponibles
            serviciosDisponibles = servicios;

            // Agrupar por categoría
            const categorias = {};
            servicios.forEach(s => {
                if (!categorias[s.categoria]) categorias[s.categoria] = [];
                categorias[s.categoria].push(s);
            });

            const contenedor = document.getElementById('servicios-categorias');
            contenedor.innerHTML = '';
            
            Object.entries(categorias).forEach(([categoria, lista]) => {
                const categoriaDiv = document.createElement('div');
                categoriaDiv.className = 'categoria-servicios';
                
                categoriaDiv.innerHTML = `
                    <h4 class="categoria-titulo">${categoria}</h4>
                    <div class="categoria-items">
                        ${lista.map(servicio => `
                            <button type="button" 
                                    class="servicio-btn ${serviciosSeleccionados.find(s => s.id_servicio === servicio.id_servicio) ? 'selected' : ''}" 
                                    data-servicio-id="${servicio.id_servicio}">
                                <div class="servicio-info">
                                    <div>
                                        <div class="servicio-nombre">${servicio.nombre}</div>
                                        <div class="servicio-detalles">${servicio.descripcion || 'Servicio de spa profesional'}</div>
                                    </div>
                                    <div class="servicio-duracion-container">
                                        <div class="servicio-duracion">${servicio.duracion} min</div>
                                    </div>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                `;
                
                contenedor.appendChild(categoriaDiv);
            });

            // Agregar event listeners para selección
            contenedor.querySelectorAll('.servicio-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const servicioId = parseInt(btn.dataset.servicioId);
                    const servicio = servicios.find(s => s.id_servicio === servicioId);
                    
                    const yaSeleccionado = serviciosSeleccionados.find(s => s.id_servicio === servicioId);
                    if (yaSeleccionado) {
                        serviciosSeleccionados = serviciosSeleccionados.filter(s => s.id_servicio !== servicioId);
                        btn.classList.remove('selected');
                    } else {
                        serviciosSeleccionados.push(servicio);
                        btn.classList.add('selected');
                    }
                    renderServiciosSeleccionados();
                });
            });
            
        } catch (error) {
            showAlert('Error al cargar servicios: ' + error.message, true);
            console.error(error);
        }
    });

    document.getElementById('guardar-servicios-popup').onclick = () => {
        document.getElementById('servicios-popup').classList.add('hidden');
        renderServiciosSeleccionados();
    };
    
    document.getElementById('cerrar-servicios-popup').onclick = () => {
        document.getElementById('servicios-popup').classList.add('hidden');
    };

    document.getElementById('guardar-empleados-popup').onclick = () => {
        document.getElementById('empleados-popup').classList.add('hidden');
        renderEmpleadosSeleccionados();
    };
    
    document.getElementById('cerrar-empleados-popup').onclick = () => {
        document.getElementById('empleados-popup').classList.add('hidden');
    };

    // Cerrar pop-ups al hacer clic fuera de ellos
    document.addEventListener('click', (e) => {
        const popups = [
            'servicios-popup', 'empleados-popup', 'schedule-popup', 
            'validation-popup', 'admins-popup', 'employees-popup',
            'available-turnos-popup', 'historial-turnos-popup'
        ];
        
        popups.forEach(popupId => {
            const popup = document.getElementById(popupId);
            if (popup && e.target === popup) {
                popup.classList.add('hidden');
            }
        });
    });

    function renderServiciosSeleccionados() {
        const div = document.getElementById('servicios-seleccionados');
        if (!serviciosSeleccionados.length) {
            div.innerHTML = '<em>No hay servicios seleccionados</em>';
            return;
        }
        div.innerHTML = 'Seleccionados: ' + serviciosSeleccionados.map(s => s.nombre).join(', ');
        
        // Actualizar precio sugerido cuando cambien los servicios
        actualizarPrecioSugerido();
    }

    // Variable global para empleados seleccionados
    let empleadosSeleccionados = [];

    // Popup de selección de empleados
    document.getElementById('btn-seleccionar-empleados').addEventListener('click', async () => {
        try {
            document.getElementById('empleados-popup').classList.remove('hidden');
            const res = await fetch(`${API_ADMIN_BASE_URL}/empleados`, { headers: { "Authorization": `Bearer ${token}` } });
            const empleados = await res.json();

            const contenedor = document.getElementById('empleados-lista');
            contenedor.innerHTML = '';
            
            empleados.forEach(empleado => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `empleado-btn ${empleadosSeleccionados.includes(empleado.id_empleado) ? 'selected' : ''}`;
                btn.dataset.empleadoId = empleado.id_empleado;
                
                // Obtener iniciales para el avatar
                const iniciales = `${empleado.nombre.charAt(0)}${empleado.apellido ? empleado.apellido.charAt(0) : ''}`.toUpperCase();
                
                btn.innerHTML = `
                    <div class="empleado-info">
                        <div class="empleado-avatar">${iniciales}</div>
                        <div class="empleado-detalles">
                            <div class="empleado-nombre">${empleado.nombre} ${empleado.apellido || ''}</div>
                            <div class="empleado-especialidad">${empleado.puesto || 'Empleado'}</div>
                        </div>
                        ${empleadosSeleccionados.includes(empleado.id_empleado) ? '<div class="seleccion-contador">?�</div>' : ''}
                    </div>
                `;
                
                btn.addEventListener('click', () => {
                    const empleadoId = parseInt(btn.dataset.empleadoId);
                    
                    if (empleadosSeleccionados.includes(empleadoId)) {
                        empleadosSeleccionados = empleadosSeleccionados.filter(id => id !== empleadoId);
                        btn.classList.remove('selected');
                    } else {
                        empleadosSeleccionados.push(empleadoId);
                        btn.classList.add('selected');
                    }
                    
                    // Actualizar el ícono de selección
                    const contador = btn.querySelector('.seleccion-contador');
                    if (empleadosSeleccionados.includes(empleadoId)) {
                        if (!contador) {
                            btn.querySelector('.empleado-info').insertAdjacentHTML('beforeend', '<div class="seleccion-contador">?�</div>');
                        }
                    } else {
                        if (contador) {
                            contador.remove();
                        }
                    }
                    
                    renderEmpleadosSeleccionados();
                });
                
                contenedor.appendChild(btn);
            });
            
        } catch (error) {
            showAlert('Error al cargar empleados: ' + error.message, true);
            console.error(error);
        }
    });

    document.getElementById('guardar-empleados-popup').onclick = () => {
        document.getElementById('empleados-popup').classList.add('hidden');
        renderEmpleadosSeleccionados();
    };
    document.getElementById('cerrar-empleados-popup').onclick = () => {
        document.getElementById('empleados-popup').classList.add('hidden');
    };

    function renderEmpleadosSeleccionados() {
        const div = document.getElementById('empleados-seleccionados');
        if (!empleadosSeleccionados.length) {
            div.innerHTML = '<em>No hay empleados seleccionados</em>';
            return;
        }
        div.innerHTML = 'Seleccionados: ' + empleadosSeleccionados.join(', ');
    }

    // Mostrar formulario de turno
    addTurnoBtn.addEventListener("click", async () => {
        resetForm(turnoForm);
        renderServiciosSeleccionados();
        document.getElementById("turno-form-title").textContent = "Crear Turno";
        turnoFormContainer.classList.remove("hidden");
    });

    editTurnoBtn.addEventListener("click", async () => {
        const turnoId = prompt("Ingrese el ID del turno a modificar:");
        if (!turnoId || isNaN(turnoId)) {
            showAlert("ID de turno inválido", true);
            return;
        }

        try {
            // Buscar el turno en la base de datos para pre-cargar los datos
            const response = await fetch(`${API_ADMIN_BASE_URL}/turnos/${turnoId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error("Turno no encontrado");
            }
            
            const turno = await response.json();
            
            // Pre-cargar el formulario con los datos del turno
            document.getElementById("turno-fecha").value = turno.fecha;
            document.getElementById("turno-hora-inicio").value = turno.hora_inicio;
            document.getElementById("turno-hora-fin").value = turno.hora_fin;
            document.getElementById("turno-precio").value = turno.precio_total;
            
            // Cargar servicios y empleados seleccionados
            if (turno.servicios && turno.servicios.length > 0) {
                // Necesitamos obtener los objetos completos de servicios
                try {
                    const serviciosRes = await fetch(`${API_BASE_URL}/servicios`, { 
                        headers: { "Authorization": `Bearer ${token}` } 
                    });
                    const todosLosServicios = await serviciosRes.json();
                    serviciosSeleccionados = todosLosServicios.filter(s => turno.servicios.includes(s.id_servicio));
                } catch (error) {
                    console.error('Error cargando servicios:', error);
                    serviciosSeleccionados = turno.servicios.map(id => ({ id_servicio: id, nombre: `Servicio ${id}` }));
                }
            } else {
                serviciosSeleccionados = [];
            }
            
            empleadosSeleccionados = turno.empleados || [];
            
            // Actualizar visualización
            renderServiciosSeleccionados();
            renderEmpleadosSeleccionados();
            
            // Configurar el formulario para edición
            document.getElementById("turno-form-title").textContent = "Modificar Turno";
            turnoForm.dataset.action = "edit";
            turnoForm.dataset.turnoId = turnoId;
            turnoFormContainer.classList.remove("hidden");
            
            showAlert(`Turno ${turnoId} cargado para edición`);
            
        } catch (error) {
            showAlert("Error al cargar turno: " + error.message, true);
            console.error(error);
        }
    });

    deleteTurnoBtn.addEventListener("click", async () => {
        const turnoId = prompt("Ingrese el ID del turno a eliminar:");
        if (!turnoId || isNaN(turnoId)) {
            showAlert("ID de turno inválido", true);
            return;
        }

        if (confirm(`¿Está seguro que desea eliminar el turno ID ${turnoId}? Esta acción no se puede deshacer.`)) {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/turnos/${turnoId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const result = await handleFetchError(response);
                showAlert(result.message || "Turno eliminado exitosamente");
                
            } catch (error) {
                showAlert("Error al eliminar turno: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-turno").addEventListener("click", () => {
        turnoFormContainer.classList.add("hidden");
    });

    // Submit del formulario de turnos
    turnoForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        function calcularDuracion(horaInicio, horaFin) {
            try {
                if (!horaInicio || !horaFin) return 0;
                const [h1, m1] = horaInicio.split(':').map(Number);
                const [h2, m2] = horaFin.split(':').map(Number);
                const duracion = (h2 * 60 + m2) - (h1 * 60 + m1);
                console.log(`🕐 Calculando duración: ${horaInicio} a ${horaFin} = ${duracion} minutos`);
                return duracion;
            } catch (error) {
                console.error('Error calculando duración:', error);
                return 0;
            }
        }

        try {
            const servicios = serviciosSeleccionados.map(s => s.id_servicio); // Convertir a array de IDs
            const empleados = empleadosSeleccionados;
            const fecha = document.getElementById('turno-fecha').value;
            const hora_inicio = document.getElementById('turno-hora-inicio').value;
            const hora_fin = document.getElementById('turno-hora-fin').value;
            const precioInput = document.getElementById('turno-precio').value;
            const precio_total = precioInput ? parseFloat(precioInput) : 0;
            const duracion_total = calcularDuracion(hora_inicio, hora_fin);

            console.log('🔍 Validando datos antes de enviar:');
            console.log('   - precioInput:', precioInput, '(tipo:', typeof precioInput, ')');
            console.log('   - precio_total calculado:', precio_total, '(tipo:', typeof precio_total, ', isNaN:', isNaN(precio_total), ')');

            if (!servicios.length || !empleados.length || !fecha || !hora_inicio || !hora_fin) {
                throw new Error("Completa todos los campos obligatorios");
            }

            if (isNaN(precio_total) || precio_total < 0) {
                throw new Error("El precio debe ser un número válido mayor o igual a 0");
            }

            const turnoData = {
                servicios,
                empleados,
                fecha,
                hora_inicio,
                hora_fin,
                precio_total,
                duracion_total
            };

            console.log('🚀 Enviando datos del turno:');
            console.log('   - servicios:', servicios, '(length:', servicios?.length, ')');
            console.log('   - empleados:', empleados, '(length:', empleados?.length, ')');
            console.log('   - fecha:', fecha);
            console.log('   - hora_inicio:', hora_inicio);
            console.log('   - hora_fin:', hora_fin);
            console.log('   - precio_total:', precio_total, '(tipo:', typeof precio_total, ')');
            console.log('   - duracion_total:', duracion_total, '(tipo:', typeof duracion_total, ')');
            console.log('📦 Datos completos:', JSON.stringify(turnoData, null, 2));

            const isEdit = turnoForm.dataset.action === "edit";
            const endpoint = isEdit 
                ? `${API_ADMIN_BASE_URL}/turnos/${turnoForm.dataset.turnoId}`
                : `${API_ADMIN_BASE_URL}/turnos`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(turnoData)
            });

            const result = await handleFetchError(response);
            showAlert(result.message || (isEdit ? "Turno actualizado" : "Turno(s) creado(s)"));

            toggleVisibility(turnoFormContainer, false);
            // Reiniciar selecciones
            serviciosSeleccionados = [];
            empleadosSeleccionados = [];
            renderServiciosSeleccionados();
            renderEmpleadosSeleccionados();
        } catch (error) {
            console.error('Error completo:', error);
            
            // Intentar parsear el error para conflictos
            let errorData = null;
            try {
                errorData = JSON.parse(error.message);
            } catch (e) {
                // Si no es JSON, usar el mensaje tal como está
            }

            if (errorData && errorData.error === "Conflicto de horarios detectado") {
                // Es un error de conflicto, mostrar notificación especial
                const conflictDetails = {
                    conflictos: errorData.conflictos || [],
                    horaInicio: document.getElementById('turno-hora-inicio').value,
                    horaFin: document.getElementById('turno-hora-fin').value
                };
                
                showNotification(
                    "No se puede crear el turno porque uno o más empleados ya tienen turnos asignados en este horario.",
                    'conflict',
                    conflictDetails
                );
            } else {
                // Error genérico
                showAlert(error.message || "Ha ocurrido un error inesperado", true);
            }
        } finally {
            submitButton.disabled = false;
        }
    });

    // ==================== GESTIÓN DE ADMINISTRADORES ====================
    const adminFormContainer = document.getElementById("admin-form-container");
    const adminForm = document.getElementById("admin-form");
    const adminsPopup = document.getElementById("admins-popup");
    const adminsTable = document.getElementById("admins-table").querySelector("tbody");
    const addAdminBtn = document.getElementById("add-admin");
    const viewAdminsBtn = document.getElementById("view-admins");

    // Toggle para añadir administrador
    addAdminBtn.addEventListener("click", () => {
        const isFormVisible = !adminFormContainer.classList.contains("hidden");
        if (isFormVisible) {
            toggleVisibility(adminFormContainer, false);
        } else {
            resetForm(adminForm);
            toggleVisibility(adminFormContainer, true);
            adminsPopup.classList.add("hidden");
        }
    });

    // Configurar el formulario de administradores
    adminForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const formData = Object.fromEntries(new FormData(e.target));
            const response = await fetch(`${API_ADMIN_BASE_URL}/administradores`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const result = await handleFetchError(response);
            showAlert(result.message || "Administrador creado exitosamente");
            toggleVisibility(adminFormContainer, false);
            viewAdminsBtn.click();
        } catch (error) {
            showAlert("Error: " + error.message, true);
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    });

    // Toggle para ver administradores
    viewAdminsBtn.addEventListener("click", async () => {
        const isListVisible = !adminsPopup.classList.contains("hidden");
        if (isListVisible) {
            adminsPopup.classList.add("hidden");
        } else {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/administradores`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const admins = await handleFetchError(response);
                renderAdminsTable(admins);
                toggleVisibility(adminFormContainer, false);
                adminsPopup.classList.remove("hidden");
            } catch (error) {
                showAlert("Error al obtener administradores: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-admin")?.addEventListener("click", () => {
        toggleVisibility(adminFormContainer, false);
    });

    document.getElementById("cerrar-admins-popup")?.addEventListener("click", () => {
        document.getElementById("admins-popup").classList.add("hidden");
    });

    function renderAdminsTable(admins) {
        const adminsTable = document.getElementById("admins-table").querySelector("tbody");
        adminsTable.innerHTML = "";
        admins.forEach(admin => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${admin.id_admin}</td>
                <td>${admin.nombre} ${admin.apellido}</td>
                <td>${admin.email}</td>
                <td>${admin.telefono || 'N/A'}</td>
                <td>
                    <button class="action-btn delete-btn" data-id="${admin.id_admin}">Eliminar</button>
                </td>
            `;
            adminsTable.appendChild(row);
        });

        // Manejar eliminación
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                if (confirm(`¿Eliminar administrador con ID ${id}?`)) {
                    try {
                        const response = await fetch(`${API_ADMIN_BASE_URL}/administradores/${id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        
                        const result = await handleFetchError(response);
                        showAlert(result.message || "Administrador eliminado exitosamente");
                        viewAdminsBtn.click();
                    } catch (error) {
                        showAlert("Error al eliminar administrador: " + error.message, true);
                        console.error(error);
                    }
                }
            });
        });
    }

    // ==================== GESTIÓN DE EMPLEADOS ====================
    const employeeFormContainer = document.getElementById("employee-form-container");
    const employeeForm = document.getElementById("employee-form");
    const employeesPopup = document.getElementById("employees-popup");
    const employeesTable = document.getElementById("employees-table").querySelector("tbody");
    const addEmployeeBtn = document.getElementById("add-employee");
    const viewEmployeesBtn = document.getElementById("view-employees");

    // Toggle para añadir empleado
    addEmployeeBtn.addEventListener("click", () => {
        const isFormVisible = !employeeFormContainer.classList.contains("hidden");
        if (isFormVisible) {
            toggleVisibility(employeeFormContainer, false);
        } else {
            resetForm(employeeForm);
            toggleVisibility(employeeFormContainer, true);
            employeesPopup.classList.add("hidden");
        }
    });

    // Configurar el formulario de empleados
    employeeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        try {
            const formData = Object.fromEntries(new FormData(e.target));
            const response = await fetch(`${API_ADMIN_BASE_URL}/empleados`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const result = await handleFetchError(response);
            showAlert(result.message || "Empleado creado exitosamente");
            toggleVisibility(employeeFormContainer, false);
            viewEmployeesBtn.click();
        } catch (error) {
            showAlert("Error: " + error.message, true);
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    });

    // Toggle para ver empleados
    viewEmployeesBtn.addEventListener("click", async () => {
        const isListVisible = !employeesPopup.classList.contains("hidden");
        if (isListVisible) {
            employeesPopup.classList.add("hidden");
        } else {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/empleados`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const empleados = await handleFetchError(response);
                renderEmployeesTable(empleados);
                toggleVisibility(employeeFormContainer, false);
                employeesPopup.classList.remove("hidden");
                employeesPopup.classList.add("show");
            } catch (error) {
                showAlert("Error al obtener empleados: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-employee")?.addEventListener("click", () => {
        toggleVisibility(employeeFormContainer, false);
    });

    document.getElementById("close-employees-list")?.addEventListener("click", () => {
        toggleVisibility(employeesListContainer, false);
    });

    function renderEmployeesTable(empleados) {
        const employeesTable = document.getElementById("employees-table").querySelector("tbody");
        employeesTable.innerHTML = "";
        empleados.forEach(empleado => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${empleado.id_empleado}</td>
                <td>${empleado.nombre} ${empleado.apellido}</td>
                <td>${empleado.email}</td>
                <td>${empleado.puesto}</td>
                <td>
                    <button class="action-btn delete-btn" data-id="${empleado.id_empleado}">Eliminar</button>
                    <button class="action-btn edit-btn" data-id="${empleado.id_empleado}" data-nombre="${empleado.nombre} ${empleado.apellido}">Servicios</button>
                </td>
            `;
            employeesTable.appendChild(row);
        });

        // Manejar eliminación
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.dataset.id;
                if (confirm(`¿Eliminar empleado con ID ${id}?`)) {
                    try {
                        const response = await fetch(`${API_ADMIN_BASE_URL}/empleados/${id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        
                        const result = await handleFetchError(response);
                        showAlert(result.message || "Empleado eliminado exitosamente");
                        viewEmployeesBtn.click();
                    } catch (error) {
                        showAlert("Error al eliminar empleado: " + error.message, true);
                        console.error(error);
                    }
                }
            });
        });

        document.querySelectorAll(".edit-btn[data-nombre]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = btn.dataset.id;
                const nombre = btn.dataset.nombre;
                mostrarServiciosEmpleado(id, nombre);
            });
        });
    }

    // ==================== ASIGNACIÓN DE SERVICIOS A EMPLEADOS ====================
    const asignarServiciosContainer = document.getElementById("asignar-servicios-container");
    const serviciosEmpleadoList = document.getElementById("servicios-empleado-list");
    const guardarServiciosEmpleadoBtn = document.getElementById("guardar-servicios-empleado");
    const cancelarServiciosEmpleadoBtn = document.getElementById("cancelar-servicios-empleado");

    let empleadoSeleccionado = null;

    // Mostrar servicios para un empleado
    function mostrarServiciosEmpleado(idEmpleado, nombreEmpleado) {
        empleadoSeleccionado = idEmpleado;
        asignarServiciosContainer.classList.remove("hidden");
        serviciosEmpleadoList.innerHTML = `<h3>Servicios de ${nombreEmpleado}</h3><p>Cargando...</p>`;
        fetch(`${API_ADMIN_BASE_URL}/empleado-servicios/${idEmpleado}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(servicios => {
            serviciosEmpleadoList.innerHTML = servicios.map(s =>
                `<label>
                    <input type="checkbox" class="servicio-checkbox" value="${s.id_servicio}" ${s.asignado ? "checked" : ""}>
                    ${s.nombre}
                </label><br>`
            ).join("");
        });
    }

    guardarServiciosEmpleadoBtn.addEventListener("click", async () => {
        const serviciosSeleccionados = Array.from(document.querySelectorAll(".servicio-checkbox:checked")).map(cb => parseInt(cb.value));
        await fetch(`${API_ADMIN_BASE_URL}/empleado-servicios/${empleadoSeleccionado}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ servicios: serviciosSeleccionados })
        });
        alert("Servicios actualizados");
        asignarServiciosContainer.classList.add("hidden");
    });

    cancelarServiciosEmpleadoBtn.addEventListener("click", () => {
        asignarServiciosContainer.classList.add("hidden");
    });

    // ==================== DISPONIBILIDAD DE EMPLEADOS ==================== 

    // ==================== DISPONIBILIDAD DE EMPLEADOS ====================

    
    // Referencias a elementos DOM
    const checkEmployeeScheduleBtn = document.getElementById('check-employee-schedule');
    const validateAssignmentBtn = document.getElementById('validate-assignment');
    const scheduleFormContainer = document.getElementById('schedule-form-container');
    const validationFormContainer = document.getElementById('validation-form-container');
    const loadScheduleBtn = document.getElementById('load-schedule');
    const cancelScheduleBtn = document.getElementById('cancel-schedule');
    const validateEmployeesBtn = document.getElementById('validate-employees');
    const cancelValidationBtn = document.getElementById('cancel-validation');

    // Event listeners para botones principales
    checkEmployeeScheduleBtn?.addEventListener('click', () => {
        toggleVisibility(scheduleFormContainer, true);
        toggleVisibility(validationFormContainer, false);
        cargarEmpleadosSelect();
    });

    validateAssignmentBtn?.addEventListener('click', () => {
        toggleVisibility(validationFormContainer, true);
        toggleVisibility(scheduleFormContainer, false);
        cargarEmpleadosValidacion();
    });

    // Event listeners para botones de cancelar
    cancelScheduleBtn?.addEventListener('click', () => {
        toggleVisibility(scheduleFormContainer, false);
        const scheduleDisplay = document.getElementById('schedule-display');
        if (scheduleDisplay) {
            scheduleDisplay.classList.add('hidden');
        }
    });

    cancelValidationBtn?.addEventListener('click', () => {
        toggleVisibility(validationFormContainer, false);
        const validationResults = document.getElementById('validation-results');
        if (validationResults) {
            validationResults.classList.add('hidden');
        }
    });

    // Event listeners para cargar cronograma
    loadScheduleBtn?.addEventListener('click', cargarCronograma);

    // Cargar empleados en el select del cronograma
    async function cargarEmpleadosSelect() {
        try {
            const response = await fetch(`${API_BASE_URL}/empleados`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const empleados = await handleFetchError(response);
            
            const select = document.getElementById('schedule-empleado');
            select.innerHTML = '<option value="">Seleccionar empleado...</option>';
            
            empleados.forEach(empleado => {
                const option = document.createElement('option');
                option.value = empleado.id_empleado;
                option.textContent = `${empleado.nombre} ${empleado.apellido}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando empleados:', error);
            showAlert('Error al cargar empleados: ' + error.message, true);
        }
    }

    // Cargar empleados para validación (checkboxes)
    async function cargarEmpleadosValidacion() {
        try {
            const response = await fetch(`${API_ADMIN_BASE_URL}/empleados`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const empleados = await handleFetchError(response);
            
            const container = document.getElementById('validation-empleados-list');
            container.innerHTML = '';
            
            empleados.forEach(empleado => {
                const div = document.createElement('div');
                div.className = 'empleado-checkbox';
                div.innerHTML = `
                    <input type="checkbox" id="emp-${empleado.id_empleado}" value="${empleado.id_empleado}">
                    <label for="emp-${empleado.id_empleado}">${empleado.nombre} ${empleado.apellido}</label>
                `;
                container.appendChild(div);
            });
        } catch (error) {
            console.error('Error cargando empleados:', error);
            showAlert('Error al cargar empleados: ' + error.message, true);
        }
    }

    // Cargar cronograma de un empleado
    async function cargarCronograma() {
        const empleadoId = document.getElementById('schedule-empleado').value;
        const fecha = document.getElementById('schedule-fecha').value;

        console.log('=== CRONOGRAMA DEBUG v2.0 ===');
        console.log('Elemento empleado:', document.getElementById('schedule-empleado'));
        console.log('Elemento fecha:', document.getElementById('schedule-fecha'));
        console.log('EmpleadoId obtenido:', empleadoId);
        console.log('Fecha obtenida:', fecha);
        console.log('===========================');

        if (!empleadoId || !fecha) {
            showAlert('Por favor selecciona empleado y fecha', true);
            return;
        }

        console.log('Cargando cronograma para empleado:', empleadoId, 'fecha:', fecha);
        console.log('URL completa:', `${API_BASE_URL}/turnos/cronograma/${empleadoId}/${fecha}`);
        console.log('Token disponible:', !!token);
        console.log('Token completo:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

        if (!token) {
            showAlert('Error: No hay token de autenticación. Por favor, vuelve a iniciar sesión.', true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/turnos/cronograma/${empleadoId}/${fecha}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            const data = await handleFetchError(response);
            
            console.log('Cronograma recibido:', data);
            
            // Mostrar en pop-up SIN ocultar el formulario
            mostrarCronogramaEnPopup(data.turnos, fecha);
            
            // NO ocultar el formulario para evitar interferencia con el pop-up
            
        } catch (error) {
            console.error('Error cargando cronograma:', error);
            showAlert('Error al cargar cronograma: ' + error.message, true);
        }
    }

    // ==================== CERRAR SESIÓN ====================
    document.getElementById("logout-button").addEventListener("click", () => {
        if (confirm("¿Está seguro que desea cerrar sesión?")) {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        }
    });

    // ==================== GESTIÓN DE POP-UPS ADICIONALES ====================
    
    // Event listeners para cerrar todos los pop-ups
    // Event listener mejorado para el botón cerrar del cronograma
    document.getElementById("cerrar-schedule-popup")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const popup = document.getElementById("schedule-popup");
        if (popup) {
            popup.classList.add("hidden");
            popup.classList.remove("show");
            // Limpiar estilos inline forzados
            popup.style.cssText = '';
            console.log("Pop-up de cronograma cerrado por botón principal - estilos limpiados");
        }
    });

    document.getElementById("cerrar-validation-popup")?.addEventListener("click", () => {
        document.getElementById("validation-popup").classList.add("hidden");
    });

    document.getElementById("cerrar-employees-popup")?.addEventListener("click", () => {
        document.getElementById("employees-popup").classList.add("hidden");
    });

    document.getElementById("cerrar-available-turnos-popup")?.addEventListener("click", () => {
        document.getElementById("available-turnos-popup").classList.add("hidden");
    });

    document.getElementById("cerrar-historial-turnos-popup")?.addEventListener("click", () => {
        document.getElementById("historial-turnos-popup").classList.add("hidden");
    });

    // Cerrar pop-ups al hacer clic fuera - extender función existente con limpieza de estilos
    document.addEventListener('click', (e) => {
        const popups = [
            'servicios-popup', 'empleados-popup', 'schedule-popup', 
            'validation-popup', 'admins-popup', 'employees-popup',
            'available-turnos-popup', 'historial-turnos-popup'
        ];
        
        popups.forEach(popupId => {
            const popup = document.getElementById(popupId);
            if (popup && e.target === popup) {
                popup.classList.add('hidden');
                popup.classList.remove('show');
                // Limpiar estilos inline especialmente para schedule-popup
                if (popupId === 'schedule-popup') {
                    popup.style.cssText = '';
                    console.log('Pop-up de cronograma cerrado por clic fuera - estilos limpiados');
                }
            }
        });
    });

    // ==================== FUNCIONES MEJORADAS PARA CRONOGRAMA ====================

    function mostrarCronogramaEnPopup(cronograma, fecha) {
        const content = document.getElementById("schedule-content");
        const popup = document.getElementById("schedule-popup");
        
        // Asegurar que el popup existe
        if (!popup || !content) {
            showAlert("Error: No se encontró el pop-up de cronograma", true);
            console.error("Elementos no encontrados - popup:", popup, "content:", content);
            return;
        }
        
        console.log('Mostrando cronograma en popup para fecha:', fecha, 'turnos:', cronograma);
        
        // Debug: mostrar la estructura de un turno para verificar propiedades
        if (cronograma && cronograma.length > 0) {
            console.log('Estructura del primer turno:', cronograma[0]);
            console.log('Propiedades disponibles:', Object.keys(cronograma[0]));
        }
        
        if (!cronograma || cronograma.length === 0) {
            content.innerHTML = `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">Sin turnos programados</div>
                        <div class="list-item-subtitle">No hay actividades para ${fecha}</div>
                    </div>
                </div>
            `;
        } else {
            // Aplicar estilos uniformes a todos los elementos del cronograma
            const estilosElemento = `
                margin-bottom: 15px; 
                padding: 15px; 
                border: 1px solid #e5e7eb; 
                border-radius: 8px; 
                background-color: #f9fafb;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            `;
            
            content.innerHTML = `
                <div class="scrollable-list">
                    ${cronograma.map((turno, index) => `
                        <div class="schedule-item" style="${estilosElemento}">
                            <div class="schedule-time" style="font-weight: bold; color: #2d6a4f; margin-bottom: 8px; font-size: 16px;">
                                ${turno.hora_inicio || 'Hora no especificada'} - ${turno.hora_fin || 'Fin no especificado'}
                            </div>
                            <div class="schedule-service" style="color: #374151; margin-bottom: 6px; font-size: 14px;">
                                <strong>Servicio:</strong> ${turno.servicios || 'Servicio no especificado'}
                            </div>
                            <div class="schedule-client" style="color: #6b7280; margin-bottom: 6px; font-size: 14px;">
                                <strong>Cliente:</strong> ${turno.cliente_nombre && turno.cliente_apellido ? `${turno.cliente_nombre} ${turno.cliente_apellido}` : 'Sin cliente asignado'}
                            </div>
                            <div class="validation-status ${turno.estado}" style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 5px; ${
                                turno.estado === 'disponible' ? 'background-color: #d1fae5; color: #065f46;' :
                                turno.estado === 'reservado' ? 'background-color: #fef3c7; color: #92400e;' :
                                turno.estado === 'confirmado' ? 'background-color: #dbeafe; color: #1e40af;' :
                                'background-color: #f3f4f6; color: #374151;'
                            }">
                                ${turno.estado || 'disponible'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Aplicar estilos directamente sin animaciones para evitar conflictos
        popup.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 9999 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: white !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
            max-width: 600px !important;
            width: 90% !important;
            max-height: 80vh !important;
            transition: none !important;
        `;
        
        // Limpiar clases y agregar las necesarias
        popup.classList.remove("hidden");
        popup.classList.add("show");
        
        console.log('Pop-up configurado con estilos inline forzados y espaciado uniforme');
        
        // Reforzar el event listener del botón cerrar después de mostrar el popup
        setTimeout(() => {
            const closeBtn = document.getElementById("cerrar-schedule-popup");
            if (closeBtn) {
                // Remover listeners anteriores para evitar duplicados
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                
                // Agregar el listener mejorado
                document.getElementById("cerrar-schedule-popup").addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const popup = document.getElementById("schedule-popup");
                    if (popup) {
                        popup.classList.add("hidden");
                        popup.classList.remove("show");
                        popup.style.cssText = '';
                        console.log("Pop-up de cronograma cerrado por botón - estilos limpiados");
                    }
                });
                console.log('Event listener del botón cerrar reforzado');
            }
        }, 100);
        
        // Hacer scroll para asegurar que el popup sea visible
        setTimeout(() => {
            popup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }

    // ==================== FUNCIONES MEJORADAS PARA VALIDACIÓN ====================
    
    // Mejorar la validación de empleados
    document.getElementById("validate-employees")?.addEventListener("click", async () => {
        const fecha = document.getElementById("validation-fecha").value;
        const horaInicio = document.getElementById("validation-hora-inicio").value;
        const horaFin = document.getElementById("validation-hora-fin").value;
        
        if (!fecha || !horaInicio || !horaFin) {
            showAlert("Por favor completa todos los campos", true);
            return;
        }

        // Obtener empleados seleccionados
        const empleadosSeleccionados = Array.from(
            document.querySelectorAll('#validation-empleados-list input[type="checkbox"]:checked')
        ).map(cb => parseInt(cb.value));

        if (empleadosSeleccionados.length === 0) {
            showAlert("Selecciona al menos un empleado para validar", true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/turnos/verificar-empleados`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    empleadosIds: empleadosSeleccionados,
                    fecha,
                    horaInicio,
                    horaFin
                })
            });
            
            const resultados = await handleFetchError(response);
            mostrarValidacionEnPopup(resultados);
            
        } catch (error) {
            showAlert("Error al validar disponibilidad: " + error.message, true);
            console.error(error);
        }
    });

    function mostrarValidacionEnPopup(resultados) {
        const content = document.getElementById("validation-content");
        const popup = document.getElementById("validation-popup");
        
        let html = `
            <div class="validation-summary">
                <h4>${resultados.mensaje}</h4>
            </div>
            <div class="scrollable-list">
        `;

        // Empleados disponibles
        if (resultados.disponibles && resultados.disponibles.length > 0) {
            html += '<h5>✅ Empleados Disponibles:</h5>';
            resultados.disponibles.forEach(empleado => {
                html += `
                    <div class="validation-item">
                        <div class="empleado-info">
                            <div class="empleado-name">${empleado.nombre}</div>
                            <div class="empleado-role">Empleado</div>
                        </div>
                        <div class="validation-status available">
                            ✅ DISPONIBLE
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<h5>✅ Empleados Disponibles:</h5>';
            html += '<div class="validation-item"><div class="empleado-info"><div class="empleado-name" style="color:#888">Ningún empleado disponible para este horario</div></div></div>';
        }

        // Empleados NO disponibles
        if (resultados.noDisponibles && resultados.noDisponibles.length > 0) {
            html += '<h5>❌ Empleados No Disponibles:</h5>';
            resultados.noDisponibles.forEach(empleado => {
                html += `
                    <div class="validation-item">
                        <div class="empleado-info">
                            <div class="empleado-name">${empleado.nombre}</div>
                            <div class="empleado-role">Empleado</div>
                        </div>
                        <div class="validation-status busy">
                            ❌ NO DISPONIBLE
                        </div>
                        <div class="conflict-details">
                            <small>${empleado.razon}</small>
                            ${empleado.conflictos && empleado.conflictos.length > 0 ?
                                `<div class="conflict-turnos">
                                    Conflictos: ${empleado.conflictos.map(t => t.horario || 'N/A').join(', ')}
                                </div>` : ''
                            }
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<h5>❌ Empleados No Disponibles:</h5>';
            html += '<div class="validation-item"><div class="empleado-info"><div class="empleado-name" style="color:#888">Todos los empleados están disponibles para este horario</div></div></div>';
        }

        html += '</div>';
        
        content.innerHTML = html;
        popup.classList.remove("hidden");
        popup.classList.add("show");
    }

    // ==================== MEJORAR TURNOS DISPONIBLES ====================
    
    document.getElementById("view-available-turnos")?.addEventListener("click", async () => {
        try {
            const response = await fetch(`${API_ADMIN_BASE_URL}/turnos/disponibles-admin`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            const turnos = await handleFetchError(response);
            mostrarTurnosDisponiblesEnPopup(turnos);
            
        } catch (error) {
            showAlert("Error al cargar turnos disponibles: " + error.message, true);
            console.error(error);
        }
    });

    function mostrarTurnosDisponiblesEnPopup(turnos) {
        const content = document.getElementById("available-turnos-list");
        const popup = document.getElementById("available-turnos-popup");
        
        if (!turnos || turnos.length === 0) {
            content.innerHTML = `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">No hay turnos disponibles</div>
                        <div class="list-item-subtitle">Todos los horarios están ocupados</div>
                    </div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="scrollable-list">
                    ${turnos.map(turno => {
                        // Usar los nombres correctos de las propiedades del backend
                        const fecha = turno.fecha || 'Fecha no especificada';
                        const horaInicio = turno.hora_inicio || 'Hora no especificada';
                        const horaFin = turno.hora_fin || '';
                        const servicios = turno.servicios || 'Servicio no especificado';
                        const empleados = turno.empleados || 'Empleado no asignado';
                        const precio = turno.precio_total || '0';
                        const idTurno = turno.id_turno || 'N/A';
                        const estado = turno.estado || 'disponible';
                        const duracion = turno.duracion_total || '';
                        
                        // Formatear fecha
                        let fechaFormateada = fecha;
                        if (fecha !== 'Fecha no especificada') {
                            try {
                                fechaFormateada = new Date(fecha).toLocaleDateString('es-ES');
                            } catch (e) {
                                fechaFormateada = fecha;
                            }
                        }
                        
                        return `
                            <div class="list-item">
                                <div class="list-item-content">
                                    <div class="list-item-title">
                                        ${fechaFormateada} - ${horaInicio}${horaFin ? ` a ${horaFin}` : ''}
                                        <span class="validation-status ${estado}">${estado}</span>
                                    </div>
                                    <div class="list-item-subtitle">
                                        Servicios: ${servicios} | Empleados: ${empleados}
                                    </div>
                                    <div class="list-item-subtitle">
                                        Precio: $${parseFloat(precio || 0).toFixed(2)}${duracion ? ` | Duración: ${duracion} min` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        popup.classList.remove("hidden");
        popup.classList.add("show");
    }

    // ==================== MEJORAR HISTORIAL DE TURNOS ====================
    
    document.getElementById("view-historial-turnos")?.addEventListener("click", async () => {
        await cargarHistorialTurnos('reservado'); // Cargar turnos reservados por defecto
        document.getElementById("historial-turnos-popup").classList.remove("hidden");
        document.getElementById("historial-turnos-popup").classList.add("show");
    });

    // Event listeners para filtros de historial
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Remover clase active de todos los botones
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Agregar clase active al botón clickeado
            e.target.classList.add('active');
            
            const filterId = e.target.id.replace('filter-', '');
            
            // Mapear los IDs de filtros a los estados reales de la base de datos
            const estadoMapped = filterId === 'reservado' ? 'reservado' : 
                               filterId === 'confirmado' ? 'atendido' :
                               filterId === 'cancelado' ? 'cancelado' :
                               filterId === 'expirado' ? 'expirado' :
                               filterId === 'no-realizado' ? 'no_realizado' :
                               'todos';
            
            await cargarHistorialTurnos(estadoMapped);
        });
    });

    async function cargarHistorialTurnos(estado) {
        try {
            const url = estado === 'todos' 
                ? `${API_BASE_URL}/turnos/historial-completo`
                : `${API_BASE_URL}/turnos/historial-completo?estado=${estado}`;
            
            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            const turnos = await handleFetchError(response);
            mostrarHistorialEnPopup(turnos, estado);
            
        } catch (error) {
            showAlert("Error al cargar historial: " + error.message, true);
            console.error(error);
        }
    }

    function mostrarHistorialEnPopup(turnos, estado) {
        const content = document.getElementById("historial-turnos-list");
        
        // Mapear estado interno a texto amigable
        const estadoTexto = estado === 'atendido' ? 'confirmados' :
                           estado === 'reservado' ? 'reservados' :
                           estado === 'cancelado' ? 'cancelados' :
                           estado === 'expirado' ? 'expirados' :
                           estado === 'no_realizado' ? 'no realizados' :
                           estado === 'todos' ? '' : estado;
        
        if (!turnos || turnos.length === 0) {
            content.innerHTML = `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">No hay turnos ${estadoTexto}</div>
                        <div class="list-item-subtitle">No se encontraron registros para este filtro</div>
                    </div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="scrollable-list">
                    ${turnos.map(turno => `
                        <div class="list-item">
                            <div class="list-item-content">
                                <div class="list-item-title">
                                    ${turno.fecha} - ${turno.hora_inicio}
                                    <span class="validation-status ${turno.estado}">${turno.estado}</span>
                                </div>
                                <div class="list-item-subtitle">
                                    Cliente: ${turno.cliente_nombre && turno.cliente_apellido ? `${turno.cliente_nombre} ${turno.cliente_apellido}` : 'No asignado'} | 
                                    Servicios: ${turno.servicios || 'N/A'} | 
                                    Empleados: ${turno.empleados || 'N/A'} | 
                                    $${turno.precio_total}
                                </div>
                            </div>
                            ${turno.estado === 'reservado' ? `
                                <div class="list-item-actions">
                                    <button class="action-btn confirm-btn" onclick="confirmarTurnoAdmin(${turno.id_turno})" title="Confirmar como atendido">
                                        ✅ Confirmar
                                    </button>
                                    <button class="action-btn cancel-btn" onclick="cancelarTurnoAdmin(${turno.id_turno})" title="Cancelar turno">
                                        ❌ Cancelar
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // ==================== FUNCIONES PARA GESTIÓN DE TURNOS ====================
    
    // Función para confirmar turno como atendido (solo admin)
    window.confirmarTurnoAdmin = async function(turnoId) {
        if (!confirm('¿Estás seguro de que deseas confirmar este turno como atendido?')) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/turnos/confirmar/${turnoId}`, {
                method: 'PUT',
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            showAlert(result.mensaje || "Turno confirmado como atendido exitosamente", false);
            
            // Recargar el historial si está abierto
            const activeFilter = document.querySelector('.filter-btn.active');
            if (activeFilter) {
                const estado = activeFilter.textContent.toLowerCase();
                const estadoMapped = estado === 'reservados' ? 'reservado' : 
                                  estado === 'confirmados' ? 'atendido' :
                                  estado === 'cancelados' ? 'cancelado' :
                                  estado === 'expirados' ? 'expirado' :
                                  estado === 'no realizados' ? 'no_realizado' :
                                  'todos';
                await cargarHistorialTurnos(estadoMapped);
            }
            
        } catch (error) {
            console.error('Error al confirmar turno:', error);
            showAlert(`Error al confirmar turno: ${error.message}`, true);
        }
    };
    
    // Función para cancelar turno (admin puede cancelar sin restricciones)
    window.cancelarTurnoAdmin = async function(turnoId) {
        if (!confirm('¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/turnos/cancelar/${turnoId}`, {
                method: 'PUT',
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            showAlert(result.mensaje || "Turno cancelado exitosamente", false);
            
            // Recargar el historial si está abierto
            const activeFilter = document.querySelector('.filter-btn.active');
            if (activeFilter) {
                const estado = activeFilter.textContent.toLowerCase();
                const estadoMapped = estado === 'reservados' ? 'reservado' : 
                                  estado === 'confirmados' ? 'atendido' :
                                  estado === 'cancelados' ? 'cancelado' :
                                  estado === 'expirados' ? 'expirado' :
                                  estado === 'no realizados' ? 'no_realizado' :
                                  'todos';
                await cargarHistorialTurnos(estadoMapped);
            }
            
        } catch (error) {
            console.error('Error al cancelar turno:', error);
            showAlert(`Error al cancelar turno: ${error.message}`, true);
        }
    };

    // ...existing code...
});
