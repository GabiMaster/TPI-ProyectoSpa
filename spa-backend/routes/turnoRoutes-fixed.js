const express = require('express');
const db = require('../db');
const router = express.Router();
const nodemailer = require('nodemailer');
const verifyToken = require('../middleware/verifyToken');
const TurnoStatusManager = require('../turnoStatusManager');
const EmpleadoScheduleManager = require('../empleadoScheduleManager');

// Instancia del gestor de turnos
const turnoManager = new TurnoStatusManager();
const empleadoScheduleManager = new EmpleadoScheduleManager();

const transporter = nodemailer.createTransporter({
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
            query = `SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total,
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
            query = `SELECT DISTINCT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total,
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
                        <p><strong>Precio:</strong> $${turnoInfo.precio_total}</p>
                        ${turnoInfo.empleados ? `<p><strong>Empleados:</strong> ${turnoInfo.empleados}</p>` : ''}
                    </div>
                    
                    <div style="background-color: #e8f5e8; border: 1px solid #4caf50; border-radius: 10px; padding: 15px; margin: 20px 0;">
                        <h4 style="color: #2e7d32; margin-top: 0;">Importante</h4>
                        <ul style="color: #333; margin: 0; padding-left: 20px;">
                            <li>Llega 10 minutos antes de tu cita</li>
                            <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación</li>
                            <li>Trae ropa cómoda y evita comidas pesadas 2 horas antes</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666;">¡Esperamos verte pronto!</p>
                        <p style="color: #d14d72; font-weight: bold;">Spa Sentirse Bien</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ 
            message: 'Turno reservado exitosamente',
            turno: turnoInfo
        });

    } catch (error) {
        console.error('Error al reservar turno:', error);
        if (error.message && error.message.includes('turno no está disponible')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
});

module.exports = router;
