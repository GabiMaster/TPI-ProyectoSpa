const express = require('express');
const db = require('../db');
const router = express.Router();
const nodemailer = require('nodemailer');
const verifyToken = require('../middleware/verifyToken');
const TurnoStatusManager = require('../turnoStatusManager');

// Instancia del gestor de turnos
const turnoManager = new TurnoStatusManager();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Endpoint para obtener turnos disponibles por categoría
router.get('/disponibles/:categoria', async (req, res) => {
    const { categoria } = req.params;
    try {
        let query;
        let params;

        if (categoria.toLowerCase() === 'combos') {
            // Para combos: SOLO turnos que tienen servicios de diferentes categorías
            query = `SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio, t.duracion_total,
                            (SELECT GROUP_CONCAT(DISTINCT s2.nombre SEPARATOR ', ') 
                             FROM turno_servicio ts2 
                             JOIN servicio s2 ON ts2.id_servicio = s2.id_servicio 
                             WHERE ts2.id_turno = t.id_turno) AS servicios,
                            (SELECT GROUP_CONCAT(DISTINCT CONCAT(e2.nombre, ' ', e2.apellido) SEPARATOR ', ') 
                             FROM turno_empleado te2 
                             JOIN empleado e2 ON te2.id_empleado = e2.id_empleado 
                             WHERE te2.id_turno = t.id_turno) AS empleados
                     FROM turno t
                     WHERE t.estado = 'disponible'
                     AND t.id_turno IN (
                         SELECT ts.id_turno 
                         FROM turno_servicio ts
                         JOIN servicio s ON ts.id_servicio = s.id_servicio
                         GROUP BY ts.id_turno
                         HAVING COUNT(DISTINCT s.categoria) > 1
                     )
                     ORDER BY t.fecha, t.hora`;
            params = [];
        } else {
            // Para categoría específica: SOLO turnos con servicios exclusivamente de esa categoría
            query = `SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio, t.duracion_total,
                            (SELECT GROUP_CONCAT(DISTINCT s2.nombre SEPARATOR ', ') 
                             FROM turno_servicio ts2 
                             JOIN servicio s2 ON ts2.id_servicio = s2.id_servicio 
                             WHERE ts2.id_turno = t.id_turno) AS servicios,
                            (SELECT GROUP_CONCAT(DISTINCT CONCAT(e2.nombre, ' ', e2.apellido) SEPARATOR ', ') 
                             FROM turno_empleado te2 
                             JOIN empleado e2 ON te2.id_empleado = e2.id_empleado 
                             WHERE te2.id_turno = t.id_turno) AS empleados
                     FROM turno t
                     WHERE t.estado = 'disponible'
                     AND t.id_turno IN (
                         SELECT ts.id_turno 
                         FROM turno_servicio ts
                         JOIN servicio s ON ts.id_servicio = s.id_servicio
                         WHERE s.categoria = ?
                         GROUP BY ts.id_turno
                         HAVING COUNT(DISTINCT s.categoria) = 1
                     )
                     ORDER BY t.fecha, t.hora`;
            params = [categoria];
        }

        const [turnos] = await db.query(query, params);
        res.json(turnos);
    } catch (error) {
        console.error('Error al obtener turnos disponibles:', error);
        res.status(500).json({ error: 'Error al obtener turnos disponibles' });
    }
});

// Endpoint para reservar un turno existente
router.post('/reservas', verifyToken, async (req, res) => {
    console.log('Datos recibidos:', req.body);
    try {
        const { turno } = req.body;
        const clienteId = req.user.id;

        // Validar datos básicos
        if (!turno || !turno.id_turno) {
            return res.status(400).json({ error: 'ID de turno requerido' });
        }

        // Verificar que el usuario sea cliente
        if (req.user.role !== 'cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden reservar turnos' });
        }

        // Usar el gestor de turnos para reservar
        await turnoManager.reservarTurno(turno.id_turno, clienteId);

        // Obtener datos del turno reservado para el email
        const [turnoData] = await db.query(`
            SELECT t.*, c.nombre, c.apellido, c.email,
                   GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados
            FROM turno t
            JOIN cliente c ON t.id_cliente = c.id_cliente
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_turno = ?
            GROUP BY t.id_turno
        `, [turno.id_turno]);

        if (turnoData.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        const turnoInfo = turnoData[0];
        
        // Formatear fecha y hora
        const fechaFormateada = new Date(turnoInfo.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const horaFormateada = `${turnoInfo.hora.substring(0, 5)} - ${turnoInfo.hora_fin.substring(0, 5)}`;

        // Enviar email de confirmación
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: turnoInfo.email,
            subject: '✅ Confirmación de Reserva - Spa Sentirse Bien',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #d14d72; text-align: center;">¡Reserva Confirmada!</h2>
                    
                    <div style="background-color: #fff5f7; border: 1px solid #ffb3c6; border-radius: 10px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #d14d72; margin-top: 0;">Resumen de tu reserva</h3>
                        <p><strong>Turno seleccionado:</strong> Turno #${turnoInfo.id_turno}</p>
                        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                        <p><strong>Hora:</strong> ${horaFormateada}</p>
                        <p><strong>Servicios:</strong> ${turnoInfo.servicios}</p>
                        <p><strong>Duración:</strong> ${turnoInfo.duracion_total} min</p>
                        <p><strong>Precio:</strong> $${turnoInfo.precio}</p>
                        ${turnoInfo.empleados ? `<p><strong>Empleados:</strong> ${turnoInfo.empleados}</p>` : ''}
                    </div>
                    
                    <div style="background-color: #d8f3dc; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <h4 style="color: #2d6a4f; margin-top: 0;">Información importante:</h4>
                        <ul style="color: #2d6a4f;">
                            <li>Puedes cancelar tu reserva hasta 48 horas antes del turno</li>
                            <li>Te recomendamos llegar 10 minutos antes</li>
                            <li>En caso de dudas, contactanos al spa</li>
                        </ul>
                    </div>
                    
                    <p style="text-align: center; color: #2d6a4f;">
                        ¡Gracias por elegirnos! Te esperamos en Spa Sentirse Bien.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Email de confirmación enviado');

        res.status(200).json({ 
            message: 'Turno reservado exitosamente',
            turno: turnoInfo
        });

    } catch (error) {
        console.error('Error al reservar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Endpoint para obtener historial de turnos de un cliente
router.get('/historial', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden ver su historial' });
        }

        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio, t.duracion_total, t.estado, t.fecha_reserva,
                   GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados,
                   TIMESTAMPDIFF(HOUR, NOW(), CONCAT(t.fecha, ' ', t.hora)) as horas_restantes
            FROM turno t
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_cliente = ?
            GROUP BY t.id_turno
            ORDER BY t.fecha DESC, t.hora DESC
        `, [req.user.id]);

        // Agregar información sobre si puede cancelar
        const turnosConInfo = turnos.map(turno => ({
            ...turno,
            puede_cancelar: turno.estado === 'reservado' && turno.horas_restantes >= 48
        }));

        res.json(turnosConInfo);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// Endpoint para cancelar turno (cliente)
router.patch('/cancelar/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden cancelar sus turnos' });
        }

        await turnoManager.cancelarTurno(req.params.id, req.user.id);

        res.json({ message: 'Turno cancelado exitosamente' });
    } catch (error) {
        console.error('Error al cancelar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Endpoint para obtener turnos reservados (admin)
router.get('/reservados', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'administrador') {
            return res.status(403).json({ error: 'Solo los administradores pueden ver turnos reservados' });
        }

        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio, t.duracion_total, t.estado, t.fecha_reserva,
                   c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.email as cliente_email,
                   GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados
            FROM turno t
            JOIN cliente c ON t.id_cliente = c.id_cliente
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.estado = 'reservado'
            GROUP BY t.id_turno
            ORDER BY t.fecha ASC, t.hora ASC
        `);

        res.json(turnos);
    } catch (error) {
        console.error('Error al obtener turnos reservados:', error);
        res.status(500).json({ error: 'Error al obtener turnos reservados' });
    }
});

// Endpoint para confirmar turno como atendido (admin)
router.patch('/confirmar/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden confirmar turnos' });
        }

        await turnoManager.confirmarTurno(req.params.id);

        res.json({ message: 'Turno confirmado como atendido' });
    } catch (error) {
        console.error('Error al confirmar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Endpoint para cancelar turno (admin)
router.patch('/admin/cancelar/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden cancelar turnos' });
        }

        await turnoManager.cancelarTurno(req.params.id);

        res.json({ message: 'Turno cancelado exitosamente' });
    } catch (error) {
        console.error('Error al cancelar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Endpoint para obtener historial completo de turnos (admin)
router.get('/historial-completo', verifyToken, async (req, res) => {
    try {
        console.log('Usuario en historial:', req.user);
        console.log('Rol en historial:', req.user?.role);
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Solo los administradores pueden ver el historial completo',
                receivedRole: req.user?.role 
            });
        }

        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio, t.duracion_total, t.estado, t.fecha_reserva,
                   c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.email as cliente_email,
                   GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados
            FROM turno t
            LEFT JOIN cliente c ON t.id_cliente = c.id_cliente
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.estado IN ('confirmado', 'completado', 'cancelado', 'expirado', 'no_realizado')
            GROUP BY t.id_turno
            ORDER BY t.fecha DESC, t.hora DESC
        `);

        res.json(turnos);
    } catch (error) {
        console.error('Error al obtener historial completo:', error);
        res.status(500).json({ error: 'Error al obtener historial completo' });
    }
});

// Endpoint para obtener todos los turnos disponibles (para admin)
router.get('/disponibles-admin', verifyToken, async (req, res) => {
    try {
        console.log('Usuario autenticado:', req.user);
        console.log('Rol del usuario:', req.user?.role);
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Solo los administradores pueden ver turnos disponibles',
                receivedRole: req.user?.role 
            });
        }

        const [turnos] = await db.query(`
            SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total, t.estado,
                   GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                   GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados
            FROM turno t
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.estado = 'disponible'
            GROUP BY t.id_turno
            ORDER BY t.fecha ASC, t.hora ASC
        `);

        res.json(turnos);
    } catch (error) {
        console.error('Error al obtener turnos disponibles:', error);
        res.status(500).json({ error: 'Error al obtener turnos disponibles' });
    }
});

module.exports = router;
