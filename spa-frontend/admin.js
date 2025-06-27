document.addEventListener("DOMContentLoaded", () => {
    // Configuración base
    const API_BASE_URL = 'https://9plm87v2-3000.brs.devtunnels.ms/api';
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

    const showAlert = (message, isError = false) => {
        alert(`${isError ? 'Error: ' : ''}${message}`);
    };

    const handleFetchError = async (response) => {
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                const errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            } catch {
                throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
            }
        }
        return response.json();
    };

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
            document.getElementById("precio").value = serviceData.precio;
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
                const response = await fetch(`${API_BASE_URL}/servicios/${serviceId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                const result = await handleFetchError(response);
                showAlert(result.message || "Servicio eliminado exitosamente");
            } catch (error) {
                showAlert("Error al eliminar: " + error.message, true);
                console.error(error);
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
            document.getElementById("combo-servicios").value = comboData.servicios.map(s => s.id_servicio).join(", ");
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
            const formData = Object.fromEntries(new FormData(e.target));
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
                body: JSON.stringify(formData)
            });

            const result = await handleFetchError(response);
            showAlert(result.message || "Operación exitosa");
            toggleVisibility(comboFormContainer, false);
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
    });

    // ==================== GESTIÓN DE TURNOS ====================
    const turnoFormContainer = document.getElementById("turno-form-container");
    const turnoForm = document.getElementById("turno-form");
    const addTurnoBtn = document.getElementById("add-turno");
    const editTurnoBtn = document.getElementById("edit-turno");
    const deleteTurnoBtn = document.getElementById("delete-turno");

    // Variable global para servicios seleccionados
    let serviciosSeleccionados = [];

    // Popup de selección de servicios
    document.getElementById('btn-seleccionar-servicios').addEventListener('click', async () => {
        document.getElementById('servicios-popup').classList.remove('hidden');
        const res = await fetch(`${API_BASE_URL}/servicios`, { headers: { "Authorization": `Bearer ${token}` } });
        const servicios = await res.json();

        // Agrupar por categoría
        const categorias = {};
        servicios.forEach(s => {
            if (!categorias[s.categoria]) categorias[s.categoria] = [];
            categorias[s.categoria].push(s);
        });

        const contenedor = document.getElementById('servicios-categorias');
        contenedor.innerHTML = '';
        Object.entries(categorias).forEach(([cat, lista]) => {
            const catDiv = document.createElement('div');
            catDiv.innerHTML = `<h4>${cat}</h4>`;
            lista.forEach(s => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = `${s.nombre} (${s.duracion} min - $${parseFloat(s.precio).toFixed(2)})`;
                btn.className = 'servicio-btn' + (serviciosSeleccionados.includes(s.id_servicio) ? ' selected' : '');
                btn.onclick = () => {
                    if (serviciosSeleccionados.includes(s.id_servicio)) {
                        serviciosSeleccionados = serviciosSeleccionados.filter(id => id !== s.id_servicio);
                        btn.classList.remove('selected');
                    } else {
                        serviciosSeleccionados.push(s.id_servicio);
                        btn.classList.add('selected');
                    }
                    renderServiciosSeleccionados();
                };
                catDiv.appendChild(btn);
            });
            contenedor.appendChild(catDiv);
        });
    });

    document.getElementById('guardar-servicios-popup').onclick = () => {
        document.getElementById('servicios-popup').classList.add('hidden');
        renderServiciosSeleccionados();
    };
    document.getElementById('cerrar-servicios-popup').onclick = () => {
        document.getElementById('servicios-popup').classList.add('hidden');
    };

    function renderServiciosSeleccionados() {
        const div = document.getElementById('servicios-seleccionados');
        if (!serviciosSeleccionados.length) {
            div.innerHTML = '<em>No hay servicios seleccionados</em>';
            return;
        }
        div.innerHTML = 'Seleccionados: ' + serviciosSeleccionados.join(', ');
    }

    // Variable global para empleados seleccionados
    let empleadosSeleccionados = [];

    // Popup de selección de empleados
    document.getElementById('btn-seleccionar-empleados').addEventListener('click', async () => {
        document.getElementById('empleados-popup').classList.remove('hidden');
        const res = await fetch(`${API_ADMIN_BASE_URL}/empleados`, { headers: { "Authorization": `Bearer ${token}` } });
        const empleados = await res.json();

        // Si querés agrupar por puesto, podés hacerlo así:
         const puestos = {};
         empleados.forEach(e => {
             if (!puestos[e.puesto]) puestos[e.puesto] = [];
             puestos[e.puesto].push(e);
        });

        const contenedor = document.getElementById('empleados-lista');
        contenedor.innerHTML = '';
        empleados.forEach(e => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = `${e.nombre} ${e.apellido} (${e.puesto})`;
            btn.className = 'servicio-btn' + (empleadosSeleccionados.includes(e.id_empleado) ? ' selected' : '');
            btn.onclick = () => {
                if (empleadosSeleccionados.includes(e.id_empleado)) {
                    empleadosSeleccionados = empleadosSeleccionados.filter(id => id !== e.id_empleado);
                    btn.classList.remove('selected');
                } else {
                    empleadosSeleccionados.push(e.id_empleado);
                    btn.classList.add('selected');
                }
                renderEmpleadosSeleccionados();
            };
            contenedor.appendChild(btn);
        });
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
        alert("Funcionalidad de edición de turno aún no implementada.");
    });

    deleteTurnoBtn.addEventListener("click", async () => {
        alert("Funcionalidad de eliminación de turno aún no implementada.");
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
            const [h1, m1] = horaInicio.split(':').map(Number);
            const [h2, m2] = horaFin.split(':').map(Number);
            return (h2 * 60 + m2) - (h1 * 60 + m1);
        }

        try {
            const servicios = serviciosSeleccionados;
            const empleados = empleadosSeleccionados;
            const fecha = document.getElementById('turno-fecha').value;
            const hora_inicio = document.getElementById('turno-hora-inicio').value;
            const hora_fin = document.getElementById('turno-hora-fin').value;
            const precio = parseFloat(document.getElementById('turno-precio').value);
            const duracion_total = calcularDuracion(hora_inicio, hora_fin);

            if (!servicios.length || !empleados.length || !fecha || !hora_inicio || !hora_fin || isNaN(precio)) {
                throw new Error("Completa todos los campos obligatorios");
            }

            const turnoData = {
                servicios,
                empleados,
                fecha,
                hora_inicio,
                hora_fin,
                precio,
                duracion_total
            };

            const isEdit = turnoForm.dataset.id;
            const endpoint = isEdit 
                ? `${API_ADMIN_BASE_URL}/turnos/${turnoForm.dataset.id}`
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
            showAlert("Error: " + error.message, true);
            console.error(error);
        } finally {
            submitButton.disabled = false;
        }
    });

    // ==================== GESTIÓN DE ADMINISTRADORES ====================
    const adminFormContainer = document.getElementById("admin-form-container");
    const adminForm = document.getElementById("admin-form");
    const adminsListContainer = document.getElementById("admins-list-container");
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
            toggleVisibility(adminsListContainer, false);
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
        const isListVisible = !adminsListContainer.classList.contains("hidden");
        if (isListVisible) {
            toggleVisibility(adminsListContainer, false);
        } else {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/administradores`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const admins = await handleFetchError(response);
                renderAdminsTable(admins);
                toggleVisibility(adminFormContainer, false);
                toggleVisibility(adminsListContainer, true);
            } catch (error) {
                showAlert("Error al obtener administradores: " + error.message, true);
                console.error(error);
            }
        }
    });

    document.getElementById("cancel-admin")?.addEventListener("click", () => {
        toggleVisibility(adminFormContainer, false);
    });

    document.getElementById("close-admins-list")?.addEventListener("click", () => {
        toggleVisibility(adminsListContainer, false);
    });

    function renderAdminsTable(admins) {
        adminsTable.innerHTML = "";
        admins.forEach(admin => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${admin.id_admin}</td>
                <td>${admin.nombre} ${admin.apellido}</td>
                <td>${admin.email}</td>
                <td>${admin.telefono || 'N/A'}</td>
                <td>
                    <button class="btn-delete" data-id="${admin.id_admin}">Eliminar</button>
                </td>
            `;
            adminsTable.appendChild(row);
        });

        // Manejar eliminación
        document.querySelectorAll(".btn-delete").forEach(btn => {
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
    const employeesListContainer = document.getElementById("employees-list-container");
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
            toggleVisibility(employeesListContainer, false);
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
        const isListVisible = !employeesListContainer.classList.contains("hidden");
        if (isListVisible) {
            toggleVisibility(employeesListContainer, false);
        } else {
            try {
                const response = await fetch(`${API_ADMIN_BASE_URL}/empleados`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const empleados = await handleFetchError(response);
                renderEmployeesTable(empleados);
                toggleVisibility(employeeFormContainer, false);
                toggleVisibility(employeesListContainer, true);
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
        employeesTable.innerHTML = "";
        empleados.forEach(empleado => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${empleado.id_empleado}</td>
                <td>${empleado.nombre} ${empleado.apellido}</td>
                <td>${empleado.email}</td>
                <td>${empleado.puesto}</td>
                <td>
                    <button class="btn-delete" data-id="${empleado.id_empleado}">Eliminar</button>
                    <button class="btn-servicios" data-id="${empleado.id_empleado}" data-nombre="${empleado.nombre} ${empleado.apellido}">Servicios</button>
                </td>
            `;
            employeesTable.appendChild(row);
        });

        // Manejar eliminación
        document.querySelectorAll(".btn-delete").forEach(btn => {
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

        document.querySelectorAll(".btn-servicios").forEach(btn => {
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

    // ==================== GESTIÓN DE TURNOS DISPONIBLES ====================
    const availableTurnosContainer = document.getElementById("available-turnos-container");
    const availableTurnosList = document.getElementById("available-turnos-list");
    const viewAvailableTurnosBtn = document.getElementById("view-available-turnos");
    const closeAvailableTurnosBtn = document.getElementById("close-available-turnos");

    viewAvailableTurnosBtn.addEventListener("click", async () => {
        const isVisible = !availableTurnosContainer.classList.contains("hidden");
        if (isVisible) {
            toggleVisibility(availableTurnosContainer, false);
        } else {
            await cargarTurnosDisponibles();
            toggleVisibility(availableTurnosContainer, true);
        }
    });

    closeAvailableTurnosBtn.addEventListener("click", () => {
        toggleVisibility(availableTurnosContainer, false);
    });

    async function cargarTurnosDisponibles() {
        try {
            availableTurnosList.innerHTML = "<p>Cargando turnos disponibles...</p>";
            const response = await fetch(`${API_BASE_URL}/turnos/disponibles-admin`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const turnos = await handleFetchError(response);
            renderTurnosDisponibles(turnos);
        } catch (error) {
            availableTurnosList.innerHTML = `<p style="color:red">Error al cargar turnos: ${error.message}</p>`;
            console.error(error);
        }
    }

    function renderTurnosDisponibles(turnos) {
        if (!turnos || turnos.length === 0) {
            availableTurnosList.innerHTML = "<p>No hay turnos disponibles.</p>";
            return;
        }

        const estadoTexto = {
            'disponible': 'Disponible',
            'reservado': 'Reservado',
            'atendido': 'Atendido',
            'cancelado': 'Cancelado',
            'expirado': 'Expirado',
            'no_realizado': 'No Realizado'
        };

        const tabla = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Hora Inicio</th>
                        <th>Hora Fin</th>
                        <th>Servicios</th>
                        <th>Empleados</th>
                        <th>Precio</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${turnos.map(turno => `
                        <tr>
                            <td>${turno.id_turno}</td>
                            <td>${new Date(turno.fecha).toLocaleDateString('es-ES')}</td>
                            <td>${turno.hora}</td>
                            <td>${turno.hora_fin || 'N/A'}</td>
                            <td>${turno.servicios || 'N/A'}</td>
                            <td>${turno.empleados || 'N/A'}</td>
                            <td>$${Number(turno.precio_total || 0).toFixed(2)}</td>
                            <td><span class="estado-badge estado-${turno.estado}">${estadoTexto[turno.estado] || turno.estado}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
        availableTurnosList.innerHTML = tabla;
    }

    // ==================== HISTORIAL DE TURNOS ====================
    const historialTurnosContainer = document.getElementById("historial-turnos-container");
    const historialTurnosList = document.getElementById("historial-turnos-list");
    const viewHistorialTurnosBtn = document.getElementById("view-historial-turnos");
    const closeHistorialTurnosBtn = document.getElementById("close-historial-turnos");

    let currentFilter = 'confirmado';
    let historialData = [];

    viewHistorialTurnosBtn.addEventListener("click", async () => {
        const isVisible = !historialTurnosContainer.classList.contains("hidden");
        if (isVisible) {
            toggleVisibility(historialTurnosContainer, false);
        } else {
            await cargarHistorialTurnos();
            toggleVisibility(historialTurnosContainer, true);
        }
    });

    closeHistorialTurnosBtn.addEventListener("click", () => {
        toggleVisibility(historialTurnosContainer, false);
    });

    // Event listeners para los filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remover clase active de todos los botones
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Agregar clase active al botón clickeado
            e.target.classList.add('active');
            
            // Actualizar filtro y renderizar
            const filterId = e.target.id.replace('filter-', '');
            if (filterId === 'todos') {
                currentFilter = null;
            } else if (filterId === 'no-realizado') {
                currentFilter = 'no_realizado';
            } else if (filterId === 'expirado') {
                currentFilter = 'expirado';
            } else if (filterId === 'confirmado') {
                currentFilter = 'confirmado';
            } else if (filterId === 'completado') {
                currentFilter = 'completado';
            } else if (filterId === 'cancelado') {
                currentFilter = 'cancelado';
            } else {
                currentFilter = filterId;
            }
            renderHistorialTurnos();
        });
    });

    async function cargarHistorialTurnos() {
        try {
            historialTurnosList.innerHTML = "<p>Cargando historial...</p>";
            const response = await fetch(`${API_BASE_URL}/turnos/historial-completo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            historialData = await handleFetchError(response);
            renderHistorialTurnos();
        } catch (error) {
            historialTurnosList.innerHTML = `<p style="color:red">Error al cargar historial: ${error.message}</p>`;
            console.error(error);
        }
    }

    function renderHistorialTurnos() {
        let turnosFiltrados = historialData;
        
        if (currentFilter) {
            turnosFiltrados = historialData.filter(turno => turno.estado === currentFilter);
        }

        if (!turnosFiltrados || turnosFiltrados.length === 0) {
            historialTurnosList.innerHTML = `<p>No hay turnos ${currentFilter ? 'en estado ' + currentFilter : 'en el historial'}.</p>`;
            return;
        }

        // Traducir estados al español
        const estadoTexto = {
            'disponible': 'Disponible',
            'pendiente': 'Pendiente',
            'confirmado': 'Confirmado',
            'completado': 'Completado',
            'cancelado': 'Cancelado',
            'expirado': 'Expirado',
            'no_realizado': 'No Realizado'
        };

        const tabla = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Servicios</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Fecha Reserva</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${turnosFiltrados.map(turno => `
                        <tr>
                            <td>${turno.id_turno}</td>
                            <td>${turno.cliente_nombre ? `${turno.cliente_nombre} ${turno.cliente_apellido || ''}` : 'N/A'}</td>
                            <td>${new Date(turno.fecha).toLocaleDateString('es-ES')}</td>
                            <td>${turno.hora_inicio} - ${turno.hora_fin}</td>
                            <td>${turno.servicios || 'N/A'}</td>
                            <td>$${Number(turno.precio_total || 0).toFixed(2)}</td>
                            <td><span class="estado-badge estado-${turno.estado}">${estadoTexto[turno.estado] || turno.estado}</span></td>
                            <td>${turno.fecha_reserva ? new Date(turno.fecha_reserva).toLocaleDateString('es-ES') : 'N/A'}</td>
                            <td>
                                ${turno.estado === 'reservado' ? `
                                    <button class="btn-confirmar" data-id="${turno.id_turno}">Confirmar</button>
                                    <button class="btn-cancelar" data-id="${turno.id_turno}">Cancelar</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
        historialTurnosList.innerHTML = tabla;

        // Agregar event listeners para los botones de acción
        document.querySelectorAll('.btn-confirmar').forEach(btn => {
            btn.addEventListener('click', (e) => confirmarTurno(e.target.dataset.id));
        });

        document.querySelectorAll('.btn-cancelar').forEach(btn => {
            btn.addEventListener('click', (e) => cancelarTurno(e.target.dataset.id));
        });
    }

    async function confirmarTurno(idTurno) {
        if (!confirm('¿Confirmar que el cliente asistió al turno?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/turnos/confirmar/${idTurno}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await handleFetchError(response);
            showAlert(result.message || 'Turno confirmado exitosamente');
            await cargarHistorialTurnos(); // Recargar historial
        } catch (error) {
            showAlert('Error al confirmar turno: ' + error.message, true);
            console.error(error);
        }
    }

    async function cancelarTurno(idTurno) {
        if (!confirm('¿Cancelar este turno?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/turnos/admin/cancelar/${idTurno}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await handleFetchError(response);
            showAlert(result.message || 'Turno cancelado exitosamente');
            await cargarHistorialTurnos(); // Recargar historial
        } catch (error) {
            showAlert('Error al cancelar turno: ' + error.message, true);
            console.error(error);
        }
    }

    // ==================== CERRAR SESIÓN ====================
    document.getElementById("logout-button").addEventListener("click", () => {
        if (confirm("¿Está seguro que desea cerrar sesión?")) {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        }
    });
});