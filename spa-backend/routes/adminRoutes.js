const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const { sendInvitationCode } = require('../utils/mailer');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'tu_clave_secreta';

// Middleware para verificar admin
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    next();
};

// Crear nuevo administrador con contraseña temporal
router.post('/administradores', verifyToken, verifyAdmin, async (req, res) => {
    const { nombre, apellido, email, telefono } = req.body;

    try {
        // Verificar email único
        const [existing] = await db.query(
            `SELECT email FROM (
                SELECT email FROM administrador
                UNION SELECT email FROM empleado
                UNION SELECT email FROM cliente
            ) AS all_users WHERE email = ?`, 
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Generar contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Insertar administrador
        const [result] = await db.query(
            'INSERT INTO administrador (nombre, apellido, email, telefono, contraseña, temp_password) VALUES (?, ?, ?, ?, ?, TRUE)',
            [nombre, apellido, email, telefono, hashedPassword]
        );

        // Enviar correo con la contraseña temporal
        try {
            await sendInvitationCode(email, tempPassword);
            console.log(`Correo con contraseña temporal enviado a ${email}`);
        } catch (emailError) {
            console.error('Error al enviar correo:', emailError);
            // Continuamos aunque falle el correo, pero registramos el error
        }

        res.status(201).json({ 
            success: true,
            message: 'Administrador creado exitosamente. La contraseña temporal ha sido enviada al correo electrónico.',
            tempPassword,
            adminId: result.insertId
        });

    } catch (err) {
        console.error('Error al crear administrador:', err);
        res.status(500).json({ error: 'Error al crear administrador' });
    }
});

// Crear nuevo empleado con contraseña temporal
router.post('/empleados', verifyToken, verifyAdmin, async (req, res) => {
    const { nombre, apellido, email, telefono, puesto } = req.body;

    try {
        // Verificar email único
        const [existing] = await db.query(
            `SELECT email FROM (
                SELECT email FROM administrador
                UNION SELECT email FROM empleado
                UNION SELECT email FROM cliente
            ) AS all_users WHERE email = ?`, 
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Generar contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Insertar empleado
        const [result] = await db.query(
            'INSERT INTO empleado (nombre, apellido, email, telefono, contraseña, puesto, temp_password) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [nombre, apellido, email, telefono, hashedPassword, puesto]
        );

        // Enviar correo con la contraseña temporal
        try {
            await sendInvitationCode(email, tempPassword);
            console.log(`Correo con contraseña temporal enviado a ${email}`);
        } catch (emailError) {
            console.error('Error al enviar correo:', emailError);
            // Continuamos aunque falle el correo, pero registramos el error
        }

        res.status(201).json({ 
            success: true,
            message: 'Empleado creado exitosamente. La contraseña temporal ha sido enviada al correo electrónico.',
            tempPassword,
            employeeId: result.insertId
        });

    } catch (err) {
        console.error('Error al crear empleado:', err);
        res.status(500).json({ error: 'Error al crear empleado' });
    }
});

// Listar todos los empleados
router.get('/empleados', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [empleados] = await db.query(`
            SELECT id_empleado, nombre, apellido, email, puesto, 
                   temp_password as requiereCambioContraseña 
            FROM empleado
        `);
        res.json(empleados);
    } catch (err) {
        console.error('Error al obtener empleados:', err);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
});

// Eliminar empleado
router.delete('/empleados/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM empleado WHERE id_empleado = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json({ message: 'Empleado eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar empleado:', err);
        res.status(500).json({ error: 'Error al eliminar empleado' });
    }
});

// Obtener empleados habilitados para un servicio
router.get('/empleados-por-servicio/:id_servicio', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id_servicio } = req.params;
        const [empleados] = await db.query(
            `SELECT e.id_empleado, e.nombre, e.apellido, e.email, e.puesto
             FROM empleado_servicio es
             JOIN empleado e ON es.id_empleado = e.id_empleado
             WHERE es.id_servicio = ?`,
            [id_servicio]
        );
        res.json(empleados);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener empleados para el servicio' });
    }
});

router.put('/asignar-turno/:id', verifyToken, verifyAdmin, async (req, res) => {
    const idTurno = req.params.id;
    const { idEmpleado } = req.body;

    try {
        console.log('Asignando empleado:', { idTurno, idEmpleado });

        // Verifica que el empleado esté habilitado para todos los servicios del turno
        const [serviciosTurno] = await db.query(
            `SELECT id_servicio FROM turno_servicio WHERE id_turno = ?`,
            [idTurno]
        );
        
        console.log('Servicios del turno:', serviciosTurno);
        
        const serviciosIds = serviciosTurno.map(s => s.id_servicio);
        if (serviciosIds.length === 0) {
            return res.status(400).json({ error: 'El turno no tiene servicios asociados' });
        }

        // Crear placeholders para la consulta IN
        const serviciosPlaceholders = serviciosIds.map(() => '?').join(',');
        
        const [habilitado] = await db.query(
            `SELECT COUNT(*) as total FROM empleado_servicio WHERE id_empleado = ? AND id_servicio IN (${serviciosPlaceholders})`,
            [idEmpleado, ...serviciosIds]
        );
        
        console.log('Servicios habilitados para el empleado:', habilitado[0].total, 'de', serviciosIds.length);
        
        if (habilitado[0].total !== serviciosIds.length) {
            return res.status(400).json({ error: 'El empleado no está habilitado para todos los servicios del turno' });
        }

        // Verificar si ya hay un empleado asignado al turno
        const [empleadoExistente] = await db.query(
            `SELECT id_empleado FROM turno_empleado WHERE id_turno = ?`,
            [idTurno]
        );

        if (empleadoExistente.length > 0) {
            // Actualizar el empleado existente
            await db.query(
                `UPDATE turno_empleado SET id_empleado = ? WHERE id_turno = ?`,
                [idEmpleado, idTurno]
            );
        } else {
            // Insertar nuevo empleado para el turno
            await db.query(
                `INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, ?)`,
                [idTurno, idEmpleado]
            );
        }

        // El turno se mantiene en estado 'pendiente' hasta que el empleado lo confirme
        console.log('Empleado asignado exitosamente');
        res.json({ success: true, message: 'Empleado asignado al turno' });
    } catch (error) {
        console.error('Error al asignar empleado:', error);
        res.status(500).json({ error: 'Error al asignar empleado al turno' });
    }
});

router.get('/turnos-empleado/:id_empleado', verifyToken, async (req, res) => {
    const { id_empleado } = req.params;
    const db = require('../db');
    try {
        console.log('Buscando turnos para empleado:', id_empleado);
        
        const [turnos] = await db.query(
            `SELECT t.id_turno, t.fecha, t.hora, t.estado, 
                    GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicio,
                    CONCAT(c.nombre, ' ', c.apellido) AS cliente
             FROM turno t
             JOIN turno_empleado te ON t.id_turno = te.id_turno
             JOIN turno_servicio ts ON t.id_turno = ts.id_turno
             JOIN servicio s ON ts.id_servicio = s.id_servicio
             JOIN cliente c ON t.id_cliente = c.id_cliente
             WHERE te.id_empleado = ? AND t.estado = 'pendiente'
             GROUP BY t.id_turno
             ORDER BY t.fecha DESC, t.hora DESC`,
            [id_empleado]
        );
        
        console.log('Turnos pendientes encontrados para empleado', id_empleado, ':', turnos.length);
        console.log('Turnos con detalles:', JSON.stringify(turnos, null, 2));
        
        res.json(turnos);
    } catch (error) {
        console.error('Error al obtener turnos del empleado:', error);
        res.status(500).json({ error: 'Error al obtener turnos del empleado' });
    }
});

// Endpoint para obtener turnos pendientes (sin empleado asignado)
router.get('/turnos-pendientes', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [turnos] = await db.query(
            `SELECT t.id_turno, 
                    GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicio,
                    MIN(ts.id_servicio) AS id_servicio,
                    t.fecha, t.hora,
                    CONCAT(c.nombre, ' ', c.apellido) AS cliente
             FROM turno t
             JOIN turno_servicio ts ON t.id_turno = ts.id_turno
             JOIN servicio s ON ts.id_servicio = s.id_servicio
             JOIN cliente c ON t.id_cliente = c.id_cliente
             LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
             WHERE t.estado = 'pendiente' AND te.id_empleado IS NULL
             GROUP BY t.id_turno
             ORDER BY t.fecha, t.hora`
        );
        res.json(turnos);
    } catch (error) {
        console.error('Error en turnos-pendientes:', error);
        res.status(500).json({ error: 'Error al obtener turnos pendientes' });
    }
});

// Obtener servicios habilitados para un empleado
router.get('/empleado-servicios/:id_empleado', verifyToken, verifyAdmin, async (req, res) => {
    const { id_empleado } = req.params;
    try {
        const [servicios] = await db.query(
            `SELECT s.id_servicio, s.nombre, 
                CASE WHEN es.id_empleado IS NULL THEN 0 ELSE 1 END AS asignado
             FROM servicio s
             LEFT JOIN empleado_servicio es 
                ON s.id_servicio = es.id_servicio AND es.id_empleado = ?`,
            [id_empleado]
        );
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener servicios del empleado' });
    }
});

// Asignar/quitar servicios a un empleado
router.post('/empleado-servicios/:id_empleado', verifyToken, verifyAdmin, async (req, res) => {
    const { id_empleado } = req.params;
    const { servicios } = req.body; // array de id_servicio
    try {
        // Eliminar todos los servicios actuales
        await db.query('DELETE FROM empleado_servicio WHERE id_empleado = ?', [id_empleado]);
        // Insertar los nuevos
        if (Array.isArray(servicios) && servicios.length > 0) {
            const values = servicios.map(id_servicio => [id_empleado, id_servicio]);
            await db.query('INSERT INTO empleado_servicio (id_empleado, id_servicio) VALUES ?', [values]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar servicios del empleado' });
    }
});

// Listar todos los administradores
router.get('/administradores', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [admins] = await db.query(`
            SELECT id_admin, nombre, apellido, email, telefono
            FROM administrador
        `);
        res.json(admins);
    } catch (err) {
        console.error('Error al obtener administradores:', err);
        res.status(500).json({ error: 'Error al obtener administradores' });
    }
});

// Eliminar administrador (excepto el propio)
router.delete('/administradores/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        if (req.user.id === parseInt(req.params.id)) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
        }

        const [result] = await db.query('DELETE FROM administrador WHERE id_admin = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Administrador no encontrado' });
        }

        res.json({ message: 'Administrador eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar administrador:', err);
        res.status(500).json({ error: 'Error al eliminar administrador' });
    }
});

// Crear turnos predefinidos (uno por cada empleado seleccionado)
router.post('/turnos', verifyToken, verifyAdmin, async (req, res) => {
    console.log('📥 POST /api/admin/turnos BODY:', req.body);
    const { servicios, empleados, fecha, hora_inicio, hora_fin, precio, duracion_total } = req.body;

    if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos un servicio.' });
    }
    if (!empleados || !Array.isArray(empleados) || empleados.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos un empleado.' });
    }
    if (!fecha || !hora_inicio || !hora_fin || precio === undefined || duracion_total === undefined) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        for (const id_empleado of empleados) {
            // Insertar turno (sin cliente, estado disponible)
            const [result] = await conn.query(
                `INSERT INTO turno (id_cliente, fecha, hora, hora_fin, precio, duracion_total, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [null, fecha, hora_inicio, hora_fin, precio, duracion_total, 'disponible']
            );
            const id_turno = result.insertId;

            // Insertar servicios asociados
            for (const id_servicio of servicios) {
                await conn.query(
                    `INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, ?)`,
                    [id_turno, id_servicio]
                );
            }

            // Insertar empleados asociados (tabla turno_empleado)
            await conn.query(
                `INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, ?)`,
                [id_turno, id_empleado]
            );
        }

        await conn.commit();
        res.status(201).json({ message: 'Turno(s) creado(s) correctamente.' });
    } catch (err) {
        await conn.rollback();
        console.error('Error al crear turno:', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

module.exports = router;