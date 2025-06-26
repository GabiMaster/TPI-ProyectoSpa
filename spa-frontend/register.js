document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Obtener valores del formulario
    const nombre = document.getElementById("nombre").value.trim();
    const apellido = document.getElementById("apellido").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const contraseña = document.getElementById("contraseña").value;
    const confirmarContraseña = document.getElementById("confirmar-contraseña").value;

    // Validaciones
    if (contraseña !== confirmarContraseña) {
        showToastError("Las contraseñas no coinciden");
        return;
    }

    if (contraseña.length < 6) {
        showToastError("La contraseña debe tener al menos 6 caracteres");
        return;
    }

    try {
        const response = await fetch("https://9plm87v2-3000.brs.devtunnels.ms/api/clientes/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nombre,
                apellido,
                email,
                telefono,
                contraseña
            }),
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("token", data.token);
            showToastError("Registro exitoso. Redirigiendo...");
            setTimeout(() => {
                window.location.href = "index.html"; // Redirige al home
            }, 1500);
        } else {
            const errorData = await response.json();
            showToastError(errorData.error || "Error en el registro");
        }
    } catch (error) {
        console.error("Error al registrar:", error);
        showToastError("Error al conectar con el servidor");
    }
});

function showToastError(message) {
    const toast = document.getElementById("toast-error");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}