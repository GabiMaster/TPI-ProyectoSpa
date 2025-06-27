const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'tu_clave_secreta';

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Error al verificar token:', err);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Login unificado
router.post('/login', async (req, res) => {
    const { email, contraseña, password } = req.body;
    const passwordToUse = contraseña || password; // Aceptar ambos campos

    try {
        // Buscar en todas las tablas
        let user = null;
        let userType = null;
        let userId = null;
        let tempPassword = false;

        const [admins] = await db.query('SELECT * FROM administrador WHERE email = ?', [email]);
        const [empleados] = await db.query('SELECT * FROM empleado WHERE email = ?', [email]);
        const [clientes] = await db.query('SELECT * FROM cliente WHERE email = ?', [email]);

        if (admins.length > 0) {
            user = admins[0];
            userType = 'admin';
            userId = user.id_admin;
            tempPassword = user.temp_password;
        } else if (empleados.length > 0) {
            user = empleados[0];
            userType = 'empleado';
            userId = user.id_empleado;
            tempPassword = user.temp_password;
        } else if (clientes.length > 0) {
            user = clientes[0];
            userType = 'cliente';
            userId = user.id_cliente;
        }

        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Verificar contraseña
        const match = await bcrypt.compare(passwordToUse, user.contraseña);
        if (!match) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Generar token
        const token = jwt.sign(
            { 
                id: userId, 
                email: user.email, 
                role: userType,
                tempPassword 
            },
            SECRET_KEY,
            { expiresIn: '8h' } // Token válido por 8 horas
        );

        res.json({ 
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            role: userType,
            isTempPassword: tempPassword
        });

    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Cambio de contraseña (para todos los roles)
router.post('/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        // Validar nueva contraseña
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        let table, idField;
        switch(req.user.role) {
            case 'admin':
                table = 'administrador';
                idField = 'id_admin';
                break;
            case 'empleado':
                table = 'empleado';
                idField = 'id_empleado';
                break;
            case 'cliente':
                table = 'cliente';
                idField = 'id_cliente';
                break;
            default:
                return res.status(400).json({ error: 'Rol no válido' });
        }

        // Obtener usuario actual
        const [user] = await db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [req.user.id]);
        if (!user.length) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Si no es contraseña temporal, validar contraseña actual
        if (!req.user.tempPassword) {
            const match = await bcrypt.compare(currentPassword, user[0].contraseña);
            if (!match) {
                return res.status(401).json({ error: 'Contraseña actual incorrecta' });
            }
        }

        // Hash nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar en BD
        await db.query(
            `UPDATE ${table} SET contraseña = ?, temp_password = FALSE WHERE ${idField} = ?`,
            [hashedPassword, req.user.id]
        );

        res.json({ 
            success: true, 
            message: 'Contraseña actualizada exitosamente' 
        });

    } catch (err) {
        console.error('Error al cambiar contraseña:', err);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

// Obtener información del usuario autenticado
router.get('/me', verifyToken, async (req, res) => {
    try {
        let user;
        let table, idField;

        switch(req.user.role) {
            case 'admin':
                table = 'administrador';
                idField = 'id_admin';
                break;
            case 'empleado':
                table = 'empleado';
                idField = 'id_empleado';
                break;
            case 'cliente':
                table = 'cliente';
                idField = 'id_cliente';
                break;
            default:
                return res.status(400).json({ error: 'Rol no válido' });
        }

        const [rows] = await db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [req.user.id]);
        user = rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // No enviar información sensible
        delete user.contraseña;
        delete user.temp_password;

        // Agregar rol al objeto de usuario
        user.role = req.user.role;
        user.tempPassword = req.user.tempPassword;

        res.json(user);
    } catch (err) {
        console.error('Error al obtener información del usuario:', err);
        res.status(500).json({ error: 'Error al obtener información del usuario' });
    }
});
       // Obtener los turnos pendientes del empleado
router.get('/mis-turnos', verifyToken, async (req, res) => {
    if (req.user.role !== 'empleado') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    try {
        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, t.estado,
                   CONCAT(c.nombre, ' ', c.apellido) AS cliente, 
                   GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicio
            FROM turno t
            JOIN turno_empleado te ON t.id_turno = te.id_turno
            JOIN cliente c ON c.id_cliente = t.id_cliente
            JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            JOIN servicio s ON s.id_servicio = ts.id_servicio
            WHERE te.id_empleado = ? AND t.estado = 'pendiente'
            GROUP BY t.id_turno
            ORDER BY t.fecha, t.hora
        `, [req.user.id]);

        console.log('Turnos encontrados para empleado', req.user.id, ':', turnos.length);
        console.log('Datos de turnos:', JSON.stringify(turnos, null, 2));

        res.json(turnos);
    } catch (err) {
        console.error('Error al obtener turnos:', err);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
});

// Confirmar un turno asignado
router.put('/confirmar-turno/:id_turno', verifyToken, async (req, res) => {
    if (req.user.role !== 'empleado') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_turno } = req.params;
    const id_empleado = req.user.id;

    try {
        // Verificar que el turno esté asignado a este empleado
        const [asignacion] = await db.query(
            'SELECT * FROM turno_empleado WHERE id_turno = ? AND id_empleado = ?',
            [id_turno, id_empleado]
        );

        if (asignacion.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado o no asignado a este empleado' });
        }

        // Actualizar el estado del turno a confirmado
        await db.query(
            'UPDATE turno SET estado = ? WHERE id_turno = ?',
            ['confirmado', id_turno]
        );

        res.json({ success: true, message: 'Turno confirmado exitosamente' });
    } catch (error) {
        console.error('Error al confirmar turno:', error);
        res.status(500).json({ error: 'Error al confirmar turno' });
    }
});

// Cancelar un turno asignado
router.put('/cancelar-turno/:id_turno', verifyToken, async (req, res) => {
    if (req.user.role !== 'empleado') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_turno } = req.params;
    const id_empleado = req.user.id;

    try {
        // Verificar que el turno esté asignado a este empleado y obtener datos del turno
        const [turnoData] = await db.query(`
            SELECT t.*, te.id_empleado 
            FROM turno t 
            JOIN turno_empleado te ON t.id_turno = te.id_turno 
            WHERE t.id_turno = ? AND te.id_empleado = ?
        `, [id_turno, id_empleado]);

        if (turnoData.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado o no asignado a este empleado' });
        }

        const turno = turnoData[0];
        
        // Verificar restricciones de tiempo para cancelación
        const fechaTurno = new Date(turno.fecha + ' ' + turno.hora_inicio);
        const ahora = new Date();
        const horasHastaTurno = (fechaTurno - ahora) / (1000 * 60 * 60);
        
        // No permitir cancelar si quedan menos de 24 horas
        if (horasHastaTurno < 24) {
            return res.status(400).json({ 
                error: 'No se puede cancelar un turno con menos de 24 horas de anticipación' 
            });
        }
        
        // No permitir cancelar turnos ya completados o cancelados
        if (turno.estado === 'completado' || turno.estado === 'cancelado') {
            return res.status(400).json({ 
                error: `No se puede cancelar un turno ${turno.estado}` 
            });
        }

        // Quitar la asignación del empleado y cambiar estado a disponible
        await db.query('DELETE FROM turno_empleado WHERE id_turno = ? AND id_empleado = ?', [id_turno, id_empleado]);
        await db.query('UPDATE turno SET estado = ?, id_empleado = NULL WHERE id_turno = ?', ['disponible', id_turno]);

        res.json({ success: true, message: 'Turno cancelado exitosamente' });
    } catch (error) {
        console.error('Error al cancelar turno:', error);
        res.status(500).json({ error: 'Error al cancelar turno' });
    }
});


// Endpoint para verificar token (usado por el frontend)
router.get('/verify-token', verifyToken, (req, res) => {
    res.json({ 
        valid: true, 
        role: req.user.role,
        tempPassword: req.user.tempPassword 
    });
});

module.exports = router;
