// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    // Verificar sesión existente
    checkExistingSession();

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const contraseña = document.getElementById('contraseña').value;
    
    if (!email || !contraseña) {
        showToastError('Por favor completa todos los campos');
        return;
    }

    try {
        const response = await fetch('https://9plm87v2-3000.brs.devtunnels.ms/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, contraseña })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error en el servidor');
        }

        // Guardar token
        localStorage.setItem('token', data.token);
        
        // Redirección idéntica para admin y empleado
        if (data.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (data.role === 'empleado') {
            window.location.href = 'perfil-empleado.html';
        } else {
            window.location.href = 'perfil-cliente.html';
        }

    } catch (error) {
        console.error('Error en login:', error);
        showToastError(error.message || 'Error al iniciar sesión');
    }
}

function checkExistingSession() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Ocultar/mostrar elementos según rol
        document.getElementById('nav-login-link').style.display = 'none';
        document.getElementById('logout-button').style.display = 'block';
        
        if (payload.role === 'admin') {
            document.getElementById('nav-admin-link').style.display = 'block';
        } else if (payload.role === 'empleado') {
            document.getElementById('nav-employee-profile').style.display = 'block';
        } else if (payload.role === 'cliente') {
            document.getElementById('nav-client-link').style.display = 'block';
        }
    } catch (error) {
        console.error('Error al verificar token:', error);
        localStorage.removeItem('token');
    }
}

function showToastError(message) {
    const toast = document.getElementById('toast-error');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
    } else {
        alert(message);
    }
}