document.addEventListener("DOMContentLoaded", () => {
    let turnoSeleccionado = null;
    let turnosOriginales = []; // Para almacenar los turnos sin filtrar

    // Función para mostrar turnos en el grid
    function mostrarTurnos(turnos) {
        if (!turnos.length) {
            document.getElementById('popup-turnos-lista').innerHTML = "<p class='no-turnos'>No se encontraron turnos que coincidan con los filtros.</p>";
            return;
        }

        const turnosGrid = document.createElement('div');
        turnosGrid.className = 'turnos-grid';
        
        turnos.forEach(t => {
            const turnoCard = document.createElement('div');
            turnoCard.className = 'turno-card';
            turnoCard.dataset.turno = JSON.stringify(t);
            
            turnoCard.innerHTML = `
                <div class="turno-fecha-hora">
                    <div class="turno-fecha">${new Date(t.fecha).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                    <div class="turno-hora">${t.hora.slice(0,5)} - ${t.hora_fin ? t.hora_fin.slice(0,5) : '-'}</div>
                </div>
                ${t.categorias ? `<div class="turno-categoria">${t.categorias}</div>` : ''}
                <div class="turno-servicios">
                    <div class="turno-servicios-label">Servicios</div>
                    <div class="turno-servicios-lista">${t.servicios}</div>
                </div>
                <div class="turno-empleados">
                    <div class="turno-empleados-label">Empleados</div>
                    <div class="turno-empleados-lista">${t.empleados || 'Por asignar'}</div>
                </div>
                <div class="turno-footer">
                    <div class="turno-precio">$${parseFloat(t.precio_total).toFixed(2)}</div>
                    <div class="turno-duracion">${t.duracion_total || 0} min</div>
                </div>
                <button type="button" class="seleccionar-turno-btn">Seleccionar este turno</button>
            `;
            
            // Agregar event listener al botón de seleccionar
            const selectBtn = turnoCard.querySelector('.seleccionar-turno-btn');
            selectBtn.addEventListener('click', () => seleccionarTurno(t.id_turno));
            
            turnosGrid.appendChild(turnoCard);
        });
        
        document.getElementById('popup-turnos-lista').innerHTML = '';
        document.getElementById('popup-turnos-lista').appendChild(turnosGrid);
    }

    // Función para filtrar turnos
    function filtrarTurnos() {
        const filtro = document.getElementById('filtro-busqueda').value.toLowerCase();
        const ordenar = document.getElementById('filtro-ordenar').value;

        let turnosFiltrados = turnosOriginales.filter(turno => {
            const servicios = turno.servicios ? turno.servicios.toLowerCase() : '';
            const empleados = turno.empleados ? turno.empleados.toLowerCase() : '';
            const fecha = new Date(turno.fecha).toLocaleDateString('es-ES').toLowerCase();
            const categorias = turno.categorias ? turno.categorias.toLowerCase() : '';

            return servicios.includes(filtro) || 
                   empleados.includes(filtro) || 
                   fecha.includes(filtro) ||
                   categorias.includes(filtro);
        });

        // Ordenar turnos
        switch (ordenar) {
            case 'fecha':
                turnosFiltrados.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));
                break;
            case 'precio':
                turnosFiltrados.sort((a, b) => parseFloat(a.precio_total) - parseFloat(b.precio_total));
                break;
            case 'duracion':
                turnosFiltrados.sort((a, b) => (b.duracion_total || 0) - (a.duracion_total || 0));
                break;
        }

        mostrarTurnos(turnosFiltrados);
    }

    // Event listeners para filtros
    document.getElementById('filtro-busqueda').addEventListener('input', filtrarTurnos);
    document.getElementById('filtro-ordenar').addEventListener('change', filtrarTurnos);

    // Función para limpiar filtros
    function limpiarFiltros() {
        document.getElementById('filtro-busqueda').value = '';
        document.getElementById('filtro-ordenar').value = 'fecha';
    }

    // Evento para el botón de ver TODOS los turnos disponibles
    document.querySelector('.ver-todos-turnos-btn').addEventListener('click', async () => {
        limpiarFiltros(); // Limpiar filtros al abrir
        document.getElementById('popup-titulo').textContent = 'Cargando turnos disponibles...';
        document.getElementById('popup-turnos-disponibles').classList.remove('hidden');
        document.getElementById('popup-turnos-lista').innerHTML = "<div class='loading-spinner'>Cargando...</div>";

        try {
            const res = await fetch('http://localhost:3000/api/turnos/disponibles');
            
            if (!res.ok) {
                throw new Error(`Error HTTP: ${res.status}`);
            }
            
            const turnos = await res.json();
            turnosOriginales = turnos; // Guardar los turnos originales
            
            // Actualizar título con contador
            document.getElementById('popup-titulo').textContent = `Todos los turnos disponibles (${turnos.length} turnos)`;
            
            if (!turnos.length) {
                document.getElementById('popup-turnos-lista').innerHTML = "<p class='no-turnos'>No hay turnos disponibles en este momento.</p>";
            } else {
                mostrarTurnos(turnos);
            }
        } catch (e) {
            document.getElementById('popup-turnos-lista').innerHTML = "<p class='error-message'>Error al cargar los turnos. Intenta nuevamente.</p>";
            console.error('Error al cargar turnos:', e);
        }
    });

    // Evento para los botones de ver turnos por categoría
    document.querySelectorAll('.ver-turnos-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            limpiarFiltros(); // Limpiar filtros al abrir
            const categoria = btn.dataset.categoria;
            document.getElementById('popup-titulo').textContent = `Cargando turnos para ${categoria}...`;
            document.getElementById('popup-turnos-disponibles').classList.remove('hidden');
            document.getElementById('popup-turnos-lista').innerHTML = "<div class='loading-spinner'>Cargando...</div>";

            try {
                const res = await fetch(`http://localhost:3000/api/turnos/disponibles/${encodeURIComponent(categoria)}`);
                
                if (!res.ok) {
                    throw new Error(`Error HTTP: ${res.status}`);
                }
                
                const turnos = await res.json();
                turnosOriginales = turnos; // Guardar los turnos originales
                
                // Actualizar título con contador
                document.getElementById('popup-titulo').textContent = `${categoria} (${turnos.length} turnos disponibles)`;
                
                if (!turnos.length) {
                    document.getElementById('popup-turnos-lista').innerHTML = `<p class='no-turnos'>No hay turnos disponibles para la categoría ${categoria}.</p>`;
                } else {
                    mostrarTurnos(turnos);
                }
            } catch (e) {
                document.getElementById('popup-turnos-lista').innerHTML = "<p class='error-message'>Error al cargar los turnos. Intenta nuevamente.</p>";
                console.error('Error al cargar turnos:', e);
            }
        });
    });

    // Cerrar pop-up
    document.getElementById('cerrar-popup-turnos').onclick = () => {
        document.getElementById('popup-turnos-disponibles').classList.add('hidden');
    };

    // Cerrar pop-up haciendo clic fuera de él
    document.getElementById('popup-turnos-disponibles').addEventListener('click', (e) => {
        if (e.target === document.getElementById('popup-turnos-disponibles')) {
            document.getElementById('popup-turnos-disponibles').classList.add('hidden');
        }
    });

    // Función global para seleccionar turno
    window.seleccionarTurno = (idTurno) => {
        // Buscar el turno en las tarjetas
        const turnoCard = document.querySelector(`[data-turno*='"id_turno":${idTurno}']`);
        if (!turnoCard) {
            console.error('No se encontró el turno seleccionado');
            alert('Error al seleccionar el turno. Por favor, intenta nuevamente.');
            return;
        }

        try {
            turnoSeleccionado = JSON.parse(turnoCard.dataset.turno);
            
            // Actualizar resumen
            document.getElementById('turno-seleccionado').textContent = `Turno #${turnoSeleccionado.id_turno}`;
            document.getElementById('resumen-fecha').textContent = new Date(turnoSeleccionado.fecha).toLocaleDateString('es-ES');
            document.getElementById('resumen-hora').textContent = `${turnoSeleccionado.hora.slice(0,5)} - ${turnoSeleccionado.hora_fin ? turnoSeleccionado.hora_fin.slice(0,5) : '-'}`;
            document.getElementById('resumen-servicios').textContent = turnoSeleccionado.servicios;
            document.getElementById('resumen-duracion').textContent = turnoSeleccionado.duracion_total || 0;
            document.getElementById('resumen-precio').textContent = parseFloat(turnoSeleccionado.precio_total).toFixed(2);
            
            // Mostrar botón de continuar
            const continueButton = document.getElementById('continue-button');
            if (continueButton) {
                continueButton.style.display = 'block';
            }
            
            // Cerrar pop-up
            document.getElementById('popup-turnos-disponibles').classList.add('hidden');
            
            // Marcar visualmente la selección
            document.querySelectorAll('.turno-card').forEach(card => card.classList.remove('selected'));
            turnoCard.classList.add('selected');
            
        } catch (error) {
            console.error('Error al parsear datos del turno:', error);
            alert('Error al seleccionar el turno. Intenta nuevamente.');
        }
    };

    // Botón para continuar con el turno seleccionado
    document.getElementById('continue-button').addEventListener('click', () => {
        if (!turnoSeleccionado) {
            alert('No has seleccionado ningún turno.');
            return;
        }

        // Validar que el turno esté en el rango de 48-72 horas
        const fechaTurno = new Date(`${turnoSeleccionado.fecha}T${turnoSeleccionado.hora}`);
        const ahora = new Date();
        const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);

        if (diffHoras < 48) {
            alert('Solo puedes reservar turnos con al menos 48 horas de anticipación.');
            return;
        }

        if (diffHoras > 72) {
            alert('Solo puedes reservar turnos con máximo 72 horas de anticipación.');
            return;
        }

        // Redirigir a página de contacto/reserva con datos del turno
        const queryParams = new URLSearchParams({
            turnoId: turnoSeleccionado.id_turno,
            fecha: turnoSeleccionado.fecha,
            hora: turnoSeleccionado.hora,
            hora_fin: turnoSeleccionado.hora_fin,
            servicios: turnoSeleccionado.servicios,
            precio: turnoSeleccionado.precio_total,
            duracionTotal: turnoSeleccionado.duracion_total || 0
        });
        
        window.location.href = `contacto.html?${queryParams.toString()}`;
    });

    // Función para mostrar toast de error (mantener compatibilidad)
    window.showToastError = function(message) {
        const toast = document.getElementById("toast-error");
        if (toast) {
            toast.textContent = message;
            toast.classList.add("show");
            setTimeout(() => {
                toast.classList.remove("show");
            }, 3500);
        } else {
            alert(message); // Fallback si no existe el toast
        }
    };

    // Función para calcular descuento (mantener compatibilidad)
    window.calcularTotalConDescuento = function(metodoPago, precioBase) {
        if (metodoPago === 'debito') {
            return precioBase * 0.85; // 15% de descuento
        }
        return precioBase;
    };

    // Validación y cálculo en pantalla de resumen de contacto (si existe)
    const metodoPagoSelect = document.getElementById('metodo-pago');
    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener('change', (e) => {
            const metodo = e.target.value;
            const precioBase = parseFloat(document.getElementById("resumen-precio").textContent) || 0;
            const total = calcularTotalConDescuento(metodo, precioBase);
            const totalElement = document.getElementById('total');
            if (totalElement) {
                totalElement.textContent = `$${total.toFixed(2)}`;
            }
        });
    }
});