const express = require('express');
const db = require('../db');
const router = express.Router();
const nodemailer = require('nodemailer');
const verifyToken = require('../middleware/verifyToken');

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
                     AND t.id_turno NOT IN (
                         SELECT ts.id_turno 
                         FROM turno_servicio ts
                         JOIN servicio s ON ts.id_servicio = s.id_servicio
                         GROUP BY ts.id_turno
                         HAVING COUNT(DISTINCT s.categoria) > 1
                     )
                     AND t.id_turno IN (
                         SELECT ts.id_turno 
                         FROM turno_servicio ts
                         JOIN servicio s ON ts.id_servicio = s.id_servicio
                         WHERE s.categoria = ?
                         GROUP BY ts.id_turno
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
router.post('/reservas', async (req, res) => {
    console.log('Datos recibidos:', req.body);
    try {
        const { cliente, turno } = req.body;

        // Validar datos básicos
        if (!cliente || !turno || !cliente.id_cliente || !turno.id_turno) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar que el cliente existe
            const [clienteExistente] = await connection.query(
                'SELECT * FROM cliente WHERE id_cliente = ?',
                [cliente.id_cliente]
            );
            if (clienteExistente.length === 0) {
                throw new Error('Cliente no encontrado');
            }

            // Verificar que el turno existe y está disponible
            const [turnoExistente] = await connection.query(
                'SELECT * FROM turno WHERE id_turno = ? AND estado = ?',
                [turno.id_turno, 'disponible']
            );
            
            if (turnoExistente.length === 0) {
                throw new Error('El turno no está disponible');
            }
            
            // Actualizar el turno con los datos del cliente y cambiar estado
            await connection.query(
                `UPDATE turno SET 
                    id_cliente = ?, 
                    estado = ?, 
                    metodo_pago = ?
                WHERE id_turno = ?`,
                [cliente.id_cliente, 'reservado', turno.metodoPago, turno.id_turno]
            );

            // Actualizar datos del cliente
            await connection.query(
                `UPDATE cliente SET 
                    telefono = ?, 
                    nacionalidad = ?, 
                    dni = ?, 
                    comentario = ?
                WHERE id_cliente = ?`,
                [cliente.telefono, cliente.nacionalidad, cliente.dni, cliente.comentario, cliente.id_cliente]
            );

            await connection.commit();

            // Enviar email de confirmación
            try {
                const [serviciosData] = await connection.query(
                    'SELECT s.nombre FROM turno_servicio ts JOIN servicio s ON ts.id_servicio = s.id_servicio WHERE ts.id_turno = ?',
                    [turno.id_turno]
                );
                const nombresServicios = serviciosData.map(s => s.nombre).join(', ');

                const mailOptions = {
                    from: `"Sentirse Bien Spa" <${process.env.EMAIL_USER}>`,
                    to: clienteExistente[0].email,
                    subject: 'Confirmación de Reserva - Sentirse Bien',
                    html: `
                        <div style="font-family: Arial; max-width: 600px; margin: auto;">
                            <h1 style="color: #4a6baf;">¡Reserva Confirmada!</h1>
                            <p>Hola ${clienteExistente[0].nombre},</p>
                            <p>Tu reserva ha sido confirmada con estos detalles:</p>
                            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                                <p><strong>Número:</strong> #${turno.id_turno}</p>
                                <p><strong>Fecha:</strong> ${turnoExistente[0].fecha}</p>
                                <p><strong>Hora:</strong> ${turnoExistente[0].hora}</p>
                                <p><strong>Servicios:</strong> ${nombresServicios}</p>
                                <p><strong>Duración:</strong> ${turnoExistente[0].duracion_total} min</p>
                                <p><strong>Total:</strong> $${parseFloat(turnoExistente[0].precio).toFixed(2)}</p>
                                <p><strong>Método:</strong> ${turno.metodoPago}</p>
                            </div>
                            <p>Gracias por elegir Sentirse Bien Spa. ¡Te esperamos!</p>
                        </div>`
                };

                if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                    await transporter.sendMail(mailOptions);
                }
            } catch (emailError) {
                console.error('Error al enviar correo:', emailError);
            }

            res.status(201).json({
                success: true,
                message: 'Reserva registrada exitosamente',
                turnoId: turno.id_turno
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error en la transacción:', error);
            res.status(500).json({
                error: 'Error al procesar la reserva',
                details: error.message
            });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error general:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;
