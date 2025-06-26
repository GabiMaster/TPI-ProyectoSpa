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

    let fecha, hora, servicios, duracionTotal, precioTotal;

    try {
        // Decodificar token para obtener el ID y rol
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'cliente') {
            showToastError("Solo los clientes pueden reservar turnos");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
            return;
        }

        // Obtener datos básicos del cliente
        const clienteResponse = await fetch(`https://9plm87v2-3000.brs.devtunnels.ms/api/clientes/${payload.id}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!clienteResponse.ok) {
            throw new Error("Error al obtener datos del cliente");
        }

        const cliente = await clienteResponse.json();

        // Configuración de métodos de pago
        const metodoPagoRadios = document.querySelectorAll("input[name='metodo-pago']");
        const efectivoInfo = document.getElementById("efectivo-info");
        const transferenciaInfo = document.getElementById("transferencia-info");

        metodoPagoRadios.forEach(radio => {
            radio.addEventListener("change", () => {
                efectivoInfo.style.display = radio.value === "efectivo" ? "block" : "none";
                transferenciaInfo.style.display = radio.value === "transferencia" ? "block" : "none";
            });
        });

        // Obtener datos de la URL
        const urlParams = new URLSearchParams(window.location.search);
        fecha = urlParams.get("fecha");
        hora = urlParams.get("hora");
        
        // Los servicios vienen como string, no como JSON
        const serviciosString = urlParams.get("servicios");
        servicios = serviciosString ? serviciosString.split(', ').map(s => s.trim()) : [];
        
        duracionTotal = parseInt(urlParams.get("duracionTotal")) || 0;
        precioTotal = parseFloat(urlParams.get("precio")) || 0; // Cambiar "precioTotal" por "precio"
        
        // También obtener el ID del turno
        const turnoId = urlParams.get("turnoId");

        // Validar datos de reserva
        if (!fecha || !hora || servicios.length === 0) {
            showToastError("Datos de reserva incompletos");
            setTimeout(() => {
                window.location.href = "turnos.html";
            }, 2000);
            return;
        }

        // Mostrar resumen
        document.getElementById("resumen-fecha").textContent = new Date(fecha).toLocaleDateString('es-ES');
        document.getElementById("resumen-hora").textContent = hora;
        document.getElementById("resumen-duracion").textContent = duracionTotal;
        document.getElementById("resumen-precio").textContent = precioTotal.toFixed(2);

        const resumenServicios = document.getElementById("resumen-servicios");
        resumenServicios.innerHTML = "";

        // Ahora servicios es un array de nombres, no de IDs
        servicios.forEach(nombreServicio => {
            const li = document.createElement("li");
            li.textContent = nombreServicio;
            resumenServicios.appendChild(li);
        });

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
                    servicios: servicios.join(', '), // Enviar como string
                    duracionTotal,
                    precioTotal,
                    metodoPago: formData.get("metodo-pago"),
                    estado: 'pendiente'
                }
            };

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