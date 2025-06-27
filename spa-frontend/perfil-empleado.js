document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== 'empleado') {
            throw new Error('Acceso no autorizado');
        }

        const response = await fetch('https://9plm87v2-3000.brs.devtunnels.ms/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar información del empleado');
        }

        const employee = await response.json();
        renderEmployeeInfo(employee);
        setupPasswordChangeForm(employee);
        cargarTurnosAsignados();
        setupPDFDownload();

    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        if (error.message === 'Acceso no autorizado') {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
});

function renderEmployeeInfo(employee) {
    const employeeInfo = document.getElementById('employee-info');
    employeeInfo.innerHTML = `
        <p><strong>Nombre:</strong> ${employee.nombre} ${employee.apellido}</p>
        <p><strong>Email:</strong> ${employee.email}</p>
        <p><strong>Teléfono:</strong> ${employee.telefono || 'No especificado'}</p>
        <p><strong>Especialidad:</strong> ${employee.puesto}</p>
        ${employee.temp_password ? 
            '<div class="alert alert-warning">Estás usando una contraseña temporal</div>' : 
            ''}
    `;
}

function setupPasswordChangeForm(employee) {
    const showFormBtn = document.getElementById('show-password-form');
    const formContainer = document.getElementById('password-change-form');
    const form = document.getElementById('change-password-form');

    showFormBtn.addEventListener('click', () => {
        formContainer.classList.toggle('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('Las nuevas contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
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
                body: JSON.stringify({ 
                    currentPassword: employee.temp_password ? '' : currentPassword,
                    newPassword 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al cambiar contraseña');
            }

            alert('Contraseña cambiada exitosamente');
            form.reset();
            formContainer.classList.add('hidden');
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });
}

async function cargarTurnosAsignados() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`https://9plm87v2-3000.brs.devtunnels.ms/api/auth/mis-turnos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar turnos');
        }
        
        const turnos = await response.json();

        const tablaBody = document.querySelector('#tabla-turnos tbody');
        tablaBody.innerHTML = '';

        if (!turnos || turnos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="6">No tienes turnos pendientes.</td></tr>';
            return;
        }

        turnos.forEach(turno => {
            console.log('Turno recibido:', turno); // DEBUG: ver qué datos llegan
            const fechaFormateada = new Date(turno.fecha).toLocaleDateString('es-ES');
            
            // Calcular si se puede cancelar (más de 24 horas de anticipación)
            const fechaTurno = new Date(turno.fecha + ' ' + turno.hora);
            const ahora = new Date();
            const horasHastaTurno = (fechaTurno - ahora) / (1000 * 60 * 60);
            const puedeCancel = horasHastaTurno > 24 && turno.estado !== 'completado' && turno.estado !== 'cancelado';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fechaFormateada}</td>
                <td>${turno.hora.slice(0,5)}</td>
                <td>${turno.cliente}</td>
                <td>${turno.servicio}</td>
                <td>
                    <button onclick="confirmarTurno(${turno.id_turno})" class="btn-confirmar">Confirmar</button>
                    <button onclick="cancelarTurno(${turno.id_turno})" class="btn-cancelar" 
                            ${!puedeCancel ? 'disabled title="No se puede cancelar (menos de 24hs o turno completado/cancelado)"' : ''}>
                        Cancelar
                    </button>
                    ${!puedeCancel ? '<small style="color: #666; display: block;">Solo se puede cancelar con +24hs</small>' : ''}
                </td>
            `;
            tablaBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar turnos:', error);
        const tablaBody = document.querySelector('#tabla-turnos tbody');
        tablaBody.innerHTML = '<tr><td colspan="6">Error al cargar turnos.</td></tr>';
    }
}

// Función para confirmar un turno
async function confirmarTurno(idTurno) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (!confirm('¿Estás seguro de que quieres confirmar este turno?')) {
        return;
    }
    
    try {
        const response = await fetch(`https://9plm87v2-3000.brs.devtunnels.ms/api/auth/confirmar-turno/${idTurno}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Turno confirmado exitosamente');
            cargarTurnosAsignados(); // Recargar la tabla
        } else {
            alert(data.error || 'Error al confirmar turno');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al confirmar turno');
    }
}

// Función para cancelar un turno
async function cancelarTurno(idTurno) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (!confirm('¿Estás seguro de que quieres cancelar este turno? Volverá a estar disponible para asignación.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/turnos/cancelar/${idTurno}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Mostrar mensaje de éxito más detallado
            let mensaje = 'Turno cancelado exitosamente';
            if (data.horasDeAnticipacion) {
                mensaje += `\n\nCancelado con ${data.horasDeAnticipacion} horas de anticipación.`;
            }
            alert(mensaje);
            cargarTurnosAsignados(); // Recargar la tabla
        } else {
            // Mostrar mensaje de error específico y mejorado
            let errorMsg = data.error || 'Error al cancelar turno';
            
            if (errorMsg.includes('24 horas')) {
                errorMsg += '\n\n⏰ Los turnos solo pueden cancelarse con más de 24 horas de anticipación.';
                if (data.horasRestantes) {
                    errorMsg += `\nTiempo restante: ${data.horasRestantes} horas.`;
                }
            } else if (errorMsg.includes('permisos')) {
                errorMsg = '🚫 No tienes permisos para cancelar este turno.';
            } else if (errorMsg.includes('estado')) {
                errorMsg = '❌ Este turno no se puede cancelar en su estado actual.';
            }
            
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al cancelar turno');
    }
}

// Hacer las funciones globales para que puedan ser llamadas desde onclick
window.confirmarTurno = confirmarTurno;
window.cancelarTurno = cancelarTurno;

function setupPDFDownload() {
    const btn = document.getElementById('btn-descargar-pdf');
    btn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text("Turnos Pendientes", 14, 15);
        doc.autoTable({
            html: '#tabla-turnos',
            startY: 20,
            headStyles: { fillColor: [22, 160, 133] },
            margin: { left: 14, right: 14 }
        });

        doc.save('turnos_pendientes.pdf');
    });
}
