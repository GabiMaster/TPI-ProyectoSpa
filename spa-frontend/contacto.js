document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    const token = localStorage.getItem("token");
    if (!token) {
        showToastError("Debes iniciar sesión para reservar un turno");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    let fecha, hora, hora_fin, servicios, duracionTotal, precioTotal, turnoId;
    
    // Declarar tarjetaGuardada en el scope principal
    let tarjetaGuardada = null;

    try {
        // Decodificar token para obtener el ID y rol
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Payload del token:', payload);
        
        if (payload.role !== 'cliente') {
            showToastError("Solo los clientes pueden reservar turnos");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
            return;
        }

        console.log('Intentando obtener datos del cliente con ID:', payload.id);
        
        // Obtener datos básicos del cliente
        const clienteResponse = await fetch(`http://localhost:3000/api/clientes/${payload.id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        console.log('Respuesta del servidor:', clienteResponse.status, clienteResponse.statusText);

        if (!clienteResponse.ok) {
            const errorData = await clienteResponse.text();
            console.error(`Error ${clienteResponse.status}:`, errorData);
            throw new Error(`Error al obtener datos del cliente: ${clienteResponse.status} - ${errorData}`);
        }

        const cliente = await clienteResponse.json();

        // Configuración de métodos de pago
        const metodoPagoRadios = document.querySelectorAll("input[name='metodo-pago']");
        const debitoInfo = document.getElementById("debito-info");
        const transferenciaInfo = document.getElementById("transferencia-info");

        // Verificar si el cliente tiene una tarjeta guardada
        await verificarTarjetaGuardada();

        async function verificarTarjetaGuardada() {
            try {
                // Intentar obtener del servidor
                const response = await fetch(`http://localhost:3000/api/clientes/${payload.id}/tarjeta`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.tarjeta) {
                        tarjetaGuardada = data.tarjeta;
                        actualizarInterfazTarjeta();
                        return;
                    }
                }

                // Si no hay en el servidor, verificar localStorage
                const tarjetaLocal = localStorage.getItem(`tarjeta_${payload.id}`);
                if (tarjetaLocal) {
                    const tarjeta = JSON.parse(tarjetaLocal);
                    tarjetaGuardada = {
                        numero_tarjeta: '**** **** **** ' + tarjeta.numero.slice(-4),
                        titular: tarjeta.titular,
                        vencimiento: tarjeta.vencimiento,
                        dni_titular: tarjeta.dni_titular
                    };
                    actualizarInterfazTarjeta();
                }
            } catch (error) {
                console.log('No se pudo verificar tarjeta guardada:', error);
            }
        }

        function actualizarInterfazTarjeta() {
            if (tarjetaGuardada) {
                // Verificar si califica para descuento
                const fechaTurno = new Date(`${fecha}T${hora}`);
                const ahora = new Date();
                const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);
                const calificaDescuento = diffHoras > 48;
                
                const mensajeDescuento = calificaDescuento ? 
                    `<div class="descuento-elegible">
                        <small>🎉 ¡Calificas para 15% de descuento por reservar con más de 48h de anticipación!</small>
                    </div>` : '';

                debitoInfo.innerHTML = `
                    <div class="tarjeta-guardada">
                        <h4>Tarjeta Guardada</h4>
                        ${mensajeDescuento}
                        <div class="tarjeta-card-small">
                            <p><strong>Número:</strong> ${tarjetaGuardada.numero_tarjeta}</p>
                            <p><strong>Titular:</strong> ${tarjetaGuardada.titular}</p>
                            <p><strong>Vencimiento:</strong> ${tarjetaGuardada.vencimiento}</p>
                        </div>
                        <div class="tarjeta-opciones">
                            <button type="button" id="usar-tarjeta-guardada" class="btn-tarjeta primary">
                                Usar esta tarjeta
                            </button>
                            <button type="button" id="nueva-tarjeta" class="btn-tarjeta secondary">
                                Usar otra tarjeta
                            </button>
                            <button type="button" id="ir-a-perfil" class="btn-tarjeta secondary">
                                Gestionar tarjetas
                            </button>
                        </div>
                    </div>
                `;

                // Event listeners para los botones
                document.getElementById('usar-tarjeta-guardada')?.addEventListener('click', () => {
                    console.log('Usando tarjeta guardada para reserva');
                    // Marcar que se va a usar la tarjeta guardada
                    document.getElementById('usar-tarjeta-guardada').selected = true;
                    document.getElementById('usar-tarjeta-guardada').classList.add('selected');
                    
                    // Desmarcar nueva tarjeta
                    if (document.getElementById('nueva-tarjeta')) {
                        document.getElementById('nueva-tarjeta').clicked = false;
                        document.getElementById('nueva-tarjeta').classList.remove('selected');
                    }
                    
                    // Cambiar el texto del botón de reserva para que sea más claro
                    const reserveBtn = document.querySelector('.contact-reserve-button');
                    if (reserveBtn) {
                        reserveBtn.textContent = 'Confirmar reserva con tarjeta guardada';
                    }
                });

                document.getElementById('nueva-tarjeta')?.addEventListener('click', () => {
                    // Marcar que se eligió nueva tarjeta
                    document.getElementById('nueva-tarjeta').clicked = true;
                    document.getElementById('nueva-tarjeta').classList.add('selected');
                    
                    // Desmarcar tarjeta guardada
                    if (document.getElementById('usar-tarjeta-guardada')) {
                        document.getElementById('usar-tarjeta-guardada').selected = false;
                        document.getElementById('usar-tarjeta-guardada').classList.remove('selected');
                    }
                    
                    // Resetear el texto del botón de reserva
                    const reserveBtn = document.querySelector('.contact-reserve-button');
                    if (reserveBtn) {
                        reserveBtn.textContent = 'Confirmar reserva';
                    }
                    mostrarPopupTarjeta();
                });

                document.getElementById('ir-a-perfil')?.addEventListener('click', () => {
                    if (confirm('¿Deseas ir a tu perfil para gestionar tus tarjetas? Perderás el progreso de esta reserva.')) {
                        window.location.href = 'perfil-cliente.html';
                    }
                });
            } else {
                // Verificar si califica para descuento
                const fechaTurno = new Date(`${fecha}T${hora}`);
                const ahora = new Date();
                const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);
                const calificaDescuento = diffHoras > 48;
                
                const mensajeDescuento = calificaDescuento ? 
                    `<div class="descuento-elegible">
                        <small>🎉 ¡Obten 15% de descuento al pagar con débito (reservas con +48h de anticipación)!</small>
                    </div>` : '';

                debitoInfo.innerHTML = `
                    <div class="sin-tarjeta">
                        ${mensajeDescuento}
                        <p>No tienes ninguna tarjeta guardada.</p>
                        <div class="tarjeta-opciones">
                            <button type="button" id="agregar-tarjeta-nueva" class="btn-tarjeta primary">
                                Agregar nueva tarjeta
                            </button>
                            <button type="button" id="ir-a-perfil-agregar" class="btn-tarjeta secondary">
                                Ir a mi perfil
                            </button>
                        </div>
                    </div>
                `;

                document.getElementById('agregar-tarjeta-nueva')?.addEventListener('click', () => {
                    mostrarPopupTarjeta();
                });

                document.getElementById('ir-a-perfil-agregar')?.addEventListener('click', () => {
                    if (confirm('¿Deseas ir a tu perfil para agregar una tarjeta? Perderás el progreso de esta reserva.')) {
                        window.location.href = 'perfil-cliente.html';
                    }
                });
            }
        }

        metodoPagoRadios.forEach(radio => {
            radio.addEventListener("change", () => {
                debitoInfo.style.display = radio.value === "debito" ? "block" : "none";
                transferenciaInfo.style.display = radio.value === "transferencia" ? "block" : "none";
                
                // Actualizar precio según método de pago
                actualizarResumenPrecio(radio.value);
            });
        });

        // Obtener datos de la URL
        const urlParams = new URLSearchParams(window.location.search);
        fecha = urlParams.get("fecha");
        hora = urlParams.get("hora");
        hora_fin = urlParams.get("hora_fin");
        turnoId = urlParams.get("turnoId");
        
        // Los servicios vienen como string, no como JSON
        const serviciosString = urlParams.get("servicios");
        servicios = serviciosString ? serviciosString.split(', ').map(s => s.trim()) : [];
        
        duracionTotal = parseInt(urlParams.get("duracionTotal")) || 0;
        precioTotal = parseFloat(urlParams.get("precio")) || 0;

        // Validar datos de reserva
        if (!fecha || !hora || servicios.length === 0) {
            showToastError("Datos de reserva incompletos");
            setTimeout(() => {
                window.location.href = "turnos.html";
            }, 2000);
            return;
        }

        // Mostrar resumen
        document.getElementById("turno-seleccionado").textContent = turnoId ? `Turno #${turnoId}` : "Ninguno";
        document.getElementById("resumen-fecha").textContent = new Date(fecha).toLocaleDateString('es-ES');
        document.getElementById("resumen-hora").textContent = `${hora.slice(0,5)} - ${hora_fin ? hora_fin.slice(0,5) : '-'}`;
        document.getElementById("resumen-servicios").textContent = servicios.join(', ');
        document.getElementById("resumen-duracion").textContent = duracionTotal || 0;
        
        // Mostrar precio inicial
        actualizarResumenPrecio('transferencia'); // Por defecto sin descuento

        // Función para actualizar el precio según el método de pago
        function actualizarResumenPrecio(metodoPago) {
            const fechaTurno = new Date(`${fecha}T${hora}`);
            const ahora = new Date();
            const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);
            
            let precioFinal = precioTotal;
            let descuentoTexto = '';
            
            // Aplicar descuento del 15% si es débito y más de 48 horas
            if (metodoPago === 'debito' && diffHoras > 48) {
                const descuento = precioTotal * 0.15;
                precioFinal = precioTotal - descuento;
                descuentoTexto = `
                    <div class="descuento-info">
                        <small>Precio original: $${precioTotal.toFixed(2)}</small><br>
                        <small class="descuento">Descuento 15% (Débito + 48h): -$${descuento.toFixed(2)}</small>
                    </div>
                `;
            }
            
            document.getElementById("resumen-precio").innerHTML = `
                $${precioFinal.toFixed(2)}
                ${descuentoTexto}
            `;
            
            return precioFinal;
        }

        // Rellenar datos del cliente
        document.getElementById("nombre").value = cliente.nombre;
        document.getElementById("apellido").value = cliente.apellido;
        document.getElementById("correo").value = cliente.email;
        document.getElementById("confirmar-correo").value = cliente.email;
        document.getElementById("telefono").value = cliente.telefono || "";
    } catch (error) {
        console.error("Error:", error);
        showToastError(error.message || "Ocurrió un error al cargar la página");
    }

    // Enviar formulario
    const contactoForm = document.getElementById("contacto-form");
    contactoForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Verificar si se seleccionó débito
        const metodoPago = document.querySelector("input[name='metodo-pago']:checked");
        if (!metodoPago) {
            showToastError("Por favor selecciona un método de pago");
            return;
        }

        if (metodoPago.value === "debito") {
            // Verificar si tiene tarjeta guardada y si eligió usarla
            const usarGuardada = document.getElementById('usar-tarjeta-guardada')?.selected;
            const usarNueva = document.getElementById('nueva-tarjeta')?.clicked;
            
            if (tarjetaGuardada && usarGuardada && !usarNueva) {
                // Usar tarjeta guardada - obtener datos completos
                let datosTarjetaCompletos = null;
                
                try {
                    // Intentar obtener datos completos del servidor
                    const response = await fetch(`http://localhost:3000/api/clientes/${JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id}/tarjeta`, {
                        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.tarjeta) {
                            // Para la reserva, usamos los datos que tenemos (sin CVV que no se guarda)
                            datosTarjetaCompletos = {
                                numero: data.tarjeta.numero_tarjeta.replace(/\*/g, '').replace(/\s/g, ''), // Esto será solo los últimos 4 dígitos
                                titular: data.tarjeta.titular,
                                vencimiento: data.tarjeta.vencimiento,
                                dni_titular: data.tarjeta.dni_titular,
                                esGuardada: true
                            };
                        }
                    }
                } catch (error) {
                    console.log('Error al obtener tarjeta completa, usando datos locales');
                }
                
                // Si no se pudieron obtener del servidor, usar localStorage
                if (!datosTarjetaCompletos) {
                    const tarjetaLocal = localStorage.getItem(`tarjeta_${JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id}`);
                    if (tarjetaLocal) {
                        const tarjeta = JSON.parse(tarjetaLocal);
                        datosTarjetaCompletos = {
                            numero: tarjeta.numero,
                            titular: tarjeta.titular,
                            vencimiento: tarjeta.vencimiento,
                            dni_titular: tarjeta.dni_titular,
                            esGuardada: true
                        };
                    }
                }
                
                if (datosTarjetaCompletos) {
                    await procesarReserva(datosTarjetaCompletos);
                    return;
                } else {
                    showToastError("Error al obtener datos de la tarjeta guardada");
                    return;
                }
            } else {
                // Mostrar pop-up para nueva tarjeta o no tiene tarjeta guardada o no seleccionó usar la guardada
                mostrarPopupTarjeta();
                return;
            }
        }

        // Si no es débito, procesar la reserva normalmente
        await procesarReserva();
    });

    // Función para procesar la reserva
    async function procesarReserva(datosTarjeta = null) {
        try {
            // Usar las variables ya definidas al cargar la página
            // en lugar de volver a parsear los parámetros incorrectamente
            
            // Validación de rango de fechas (48 a 72 horas antes)
            const fechaTurno = new Date(`${fecha}T${hora}`);
            const ahora = new Date();
            const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);

            if (diffHoras < 48 || diffHoras > 72) {
                alert("Solo puedes reservar turnos entre 48 y 72 horas de anticipación.");
                return;
            }

            const formData = new FormData(contactoForm);
            const token = localStorage.getItem("token");
            const payload = JSON.parse(atob(token.split('.')[1]));

            // Calcular precio final con descuento si aplica
            const metodoPago = formData.get("metodo-pago");
            let precioFinal = precioTotal;
            let descuentoAplicado = 0;
            
            if (metodoPago === "debito" && diffHoras > 48) {
                descuentoAplicado = precioTotal * 0.15;
                precioFinal = precioTotal - descuentoAplicado;
            }

            // Para este sistema, vamos a usar el ID del turno en lugar de servicios individuales
            const urlParams = new URLSearchParams(window.location.search);
            const turnoId = urlParams.get("turnoId");

            const datosCompletos = {
                cliente: {
                    id_cliente: payload.id,
                    telefono: formData.get("telefono"),
                    nacionalidad: formData.get("nacionalidad"),
                    dni: formData.get("dni"),
                    comentario: formData.get("comentario") || null
                },
                turno: {
                    id_turno: turnoId, // Usar el ID del turno seleccionado
                    fecha,
                    hora,
                    hora_fin,
                    servicios: servicios.join(', '), // Enviar como string
                    duracionTotal,
                    precioTotal: precioFinal, // Precio con descuento aplicado
                    precioOriginal: precioTotal, // Precio original para referencia
                    descuentoAplicado: descuentoAplicado, // Monto del descuento
                    metodoPago: metodoPago,
                    estado: 'pendiente'
                }
            };

            // Si hay datos de tarjeta, agregarlos
            if (datosTarjeta) {
                datosCompletos.tarjeta = datosTarjeta;
            }

            // Aquí podrías consultar disponibilidad antes de enviar la reserva si lo deseas

            const response = await fetch("http://localhost:3000/api/turnos/reservas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(datosCompletos)
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'Error desconocido');
            }

            showToastError("Reserva confirmada. Recibirás un correo con los detalles.");
            setTimeout(() => {
                window.location.href = "perfil-cliente.html";
            }, 2000);
        } catch (error) {
            console.error("Error al enviar los datos:", error);
            showToastError(error.message || "Ocurrió un error al confirmar la reserva. Por favor, inténtalo nuevamente.");
        }
    }

    // Función para mostrar el pop-up de tarjeta
    function mostrarPopupTarjeta() {
        const popup = document.getElementById("tarjeta-popup");
        popup.classList.remove("hidden");
        
        // Configurar event listeners para el formulario de tarjeta
        const tarjetaForm = document.getElementById("tarjeta-form");
        const cancelarBtn = document.getElementById("cancelar-tarjeta");
        
        // Formatear número de tarjeta
        const numeroTarjeta = document.getElementById("numero-tarjeta");
        numeroTarjeta.addEventListener("input", (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedInputValue = value.match(/.{1,4}/g)?.join(' ') || value;
            if (formattedInputValue.length > 19) formattedInputValue = formattedInputValue.substr(0, 19);
            e.target.value = formattedInputValue;
        });

        // Formatear vencimiento
        const vencimiento = document.getElementById("vencimiento");
        vencimiento.addEventListener("input", (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        // Formatear CVV
        const cvv = document.getElementById("cvv");
        cvv.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
        });

        // Formatear DNI
        const dniTitular = document.getElementById("dni-titular");
        dniTitular.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 8);
        });

        // Cancelar
        cancelarBtn.addEventListener("click", () => {
            popup.classList.add("hidden");
            tarjetaForm.reset();
        });

        // Confirmar tarjeta
        tarjetaForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const formData = new FormData(tarjetaForm);
            const datosTarjeta = {
                numero: formData.get("numero-tarjeta").replace(/\s/g, ''),
                titular: formData.get("nombre-titular"),
                vencimiento: formData.get("vencimiento"),
                cvv: formData.get("cvv"),
                dni_titular: formData.get("dni-titular"),
                guardar: formData.get("guardar-tarjeta") === "on"
            };

            // Validar datos de tarjeta
            if (!validarTarjeta(datosTarjeta)) {
                return;
            }

            popup.classList.add("hidden");
            await procesarReserva(datosTarjeta);
        });
    }

    // Función para validar datos de tarjeta
    function validarTarjeta(datos) {
        const errors = [];

        if (!datos.numero || datos.numero.length !== 16) {
            errors.push("El número de tarjeta debe tener 16 dígitos");
        }

        if (!datos.titular || datos.titular.length < 3) {
            errors.push("El nombre del titular es requerido");
        }

        if (!datos.vencimiento || !datos.vencimiento.match(/^\d{2}\/\d{2}$/)) {
            errors.push("El vencimiento debe tener formato MM/AA");
        }

        if (!datos.cvv || datos.cvv.length !== 3) {
            errors.push("El CVV debe tener 3 dígitos");
        }

        if (!datos.dni_titular || datos.dni_titular.length < 7) {
            errors.push("El DNI del titular es requerido");
        }

        if (errors.length > 0) {
            showToastError(errors.join(". "));
            return false;
        }

        return true;
    }

    // Cerrar pop-up con ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const popup = document.getElementById("tarjeta-popup");
            if (!popup.classList.contains("hidden")) {
                popup.classList.add("hidden");
                document.getElementById("tarjeta-form").reset();
            }
        }
    });

    // Cerrar pop-up haciendo clic fuera
    document.getElementById("tarjeta-popup").addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.add("hidden");
            document.getElementById("tarjeta-form").reset();
        }
    });
});

function showToastError(message) {
    const toast = document.getElementById("toast-error");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}