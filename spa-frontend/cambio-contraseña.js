document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://9plm87v2-3000.brs.devtunnels.ms/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword })
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Error al cambiar contraseña');
        
        alert('Contraseña cambiada exitosamente');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
});