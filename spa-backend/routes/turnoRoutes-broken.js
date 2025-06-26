const express = require('express');
const db = require('../db');
const router = express.Router();
const nodemailer = require('nodemailer');
const verifyToken = require('../middleware/verifyToken');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.get('/historial', verifyToken, async (req, res) => {
    if (req.user.role !== 'cliente') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    try {
        const [turnos] = await db.query(
            `SELECT t.*, 
                GROUP_CONCAT(s.nombre SEPARATOR ', ') AS servicios
             FROM turno t
             LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
             LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
             WHERE t.id_cliente = ?
             GROUP BY t.id_turno
             ORDER BY t.fecha DESC, t.hora DESC`,
            [req.user.id]
        );
        res.json(turnos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el historial de reservas' });
    }
});

router.get('/disponibilidad', async (req, res) => {
    const { fecha, hora, duracion_total, servicios } = req.query;
    
    console.log('Consulta de disponibilidad:', { fecha, hora, duracion_total, servicios });
    
    if (!fecha || !hora || !duracion_total || !servicios) {
        console.log('Error: Faltan datos');
        return res.status(400).json({ disponible: false, error: 'Faltan datos' });
    }

    const serviciosArray = typeof servicios === 'string'
        ? servicios.split(',').map(Number)
        : Array.isArray(servicios) ? servicios.map(Number) : [];

    if (!serviciosArray.length) {
        console.log('Error: No se especificaron servicios');
        return res.status(400).json({ disponible: false, error: 'No se especificaron servicios' });
    }

    try {
        console.log('Buscando empleados habilitados para servicios:', serviciosArray);
        
        // Crear placeholders para IN clause
        const serviciosPlaceholders = serviciosArray.map(() => '?').join(',');
        
        const [empleadosHabilitados] = await db.query(
            `SELECT es.id_empleado
             FROM empleado_servicio es
             WHERE es.id_servicio IN (${serviciosPlaceholders})
             GROUP BY es.id_empleado
             HAVING COUNT(DISTINCT es.id_servicio) = ?`,
            [...serviciosArray, serviciosArray.length]
        );

        console.log('Empleados habilitados encontrados:', empleadosHabilitados);

        if (!empleadosHabilitados.length) {
            console.log('Error: No hay empleados habilitados');
            return res.json({ disponible: false, error: 'No hay empleados habilitados para todos los servicios seleccionados' });
        }

        const empleadosIds = empleadosHabilitados.map(e => e.id_empleado);

        const [horaFinRows] = await db.query(
            `SELECT ADDTIME(?, SEC_TO_TIME(? * 60)) AS hora_fin`, [hora, duracion_total]
        );
        const horaFin = horaFinRows[0].hora_fin;

        console.log('Calculando disponibilidad para:', { fecha, hora, horaFin, empleadosIds });

        // Crear placeholders para la segunda IN clause
        const empleadosPlaceholders = empleadosIds.map(() => '?').join(',');
        
        const [ocupados] = await db.query(
            `SELECT te.id_empleado
             FROM turno t
             JOIN turno_empleado te ON t.id_turno = te.id_turno
             WHERE t.fecha = ?
               AND t.estado != 'cancelado'
               AND (
                    (t.hora < ? AND ADDTIME(t.hora, SEC_TO_TIME(t.duracion_total * 60)) > ?) OR
                    (t.hora < ? AND ADDTIME(t.hora, SEC_TO_TIME(t.duracion_total * 60)) > ?)
                )
               AND te.id_empleado IN (${empleadosPlaceholders})`,
            [fecha, horaFin, hora, hora, horaFin, ...empleadosIds]
        );
        
        console.log('Empleados ocupados:', ocupados);
        
        const empleadosOcupados = ocupados.map(e => e.id_empleado);
        const empleadosDisponibles = empleadosIds.filter(id => !empleadosOcupados.includes(id));

        console.log('Empleados disponibles:', empleadosDisponibles);

        res.json({ disponible: empleadosDisponibles.length > 0 });
    } catch (error) {
        console.error('Error detallado en disponibilidad:', error);
        res.status(500).json({ disponible: false, error: 'Error al consultar disponibilidad' });
    }
});

router.post('/reservas', async (req, res) => {
    console.log('Datos recibidos:', req.body);
    try {
        const { cliente, turno } = req.body;

        // Validar datos básicos
        if (!cliente || !turno || !cliente.id_cliente) {
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

            let turnoId;

            if (turno.id_turno) {
                // CASO 1: Reservar un turno existente creado por el admin
                turnoId = turno.id_turno;
                
                // Verificar que el turno existe y está disponible
                const [turnoExistente] = await connection.query(
                    'SELECT * FROM turno WHERE id_turno = ? AND estado = ?',
                    [turnoId, 'disponible']
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
                    [cliente.id_cliente, 'reservado', turno.metodoPago, turnoId]
                );
                
            } else {
                // CASO 2: Crear un nuevo turno (lógica original)
                if (!turno.fecha || !turno.hora || !turno.servicios || turno.servicios.length === 0) {
                    return res.status(400).json({ error: 'Datos incompletos para crear turno' });
                }

                if (parseFloat(turno.precioTotal) <= 0) {
                    return res.status(400).json({ error: 'El precio total debe ser mayor a cero' });
                }

                // Crear nuevo turno (lógica original)
                const [turnoResult] = await connection.query(
                    `INSERT INTO turno (id_cliente, fecha, hora, duracion_total, precio, estado, metodo_pago) 
                     VALUES (?, ?, ?, ?, ?, 'reservado', ?)`,
                    [cliente.id_cliente, turno.fecha, turno.hora, turno.duracionTotal, turno.precioTotal, turno.metodoPago]
                );
                turnoId = turnoResult.insertId;

                // Insertar servicios del turno
                for (const servicioId of turno.servicios) {
                    await connection.query(
                        'INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, ?)',
                        [turnoId, servicioId]
                    );
                }
            }

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
                [
                    cliente.telefono,
                    cliente.nacionalidad,
                    cliente.dni,
                    cliente.comentario || null,
                    cliente.id_cliente
                ]
            );

            const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora}`);
            const ahora = new Date();
            const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);

            if (diffHoras < 48 || diffHoras > 72) {
                return res.status(400).json({ error: 'Solo puedes reservar turnos entre 48 y 72 horas de anticipación.' });
            }

            const [turnoResult] = await connection.query(
                `INSERT INTO turno 
                    (id_cliente, fecha, hora, duracion_total, precio_total, metodo_pago, estado) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    cliente.id_cliente,
                    turno.fecha,
                    turno.hora,
                    turno.duracionTotal,
                    turno.precioTotal,
                    turno.metodoPago,
                    'pendiente'
                ]
            );

            const turnoId = turnoResult.insertId;

            for (const servicioId of turno.servicios) {
                const [servicio] = await connection.query(
                    'SELECT nombre FROM servicio WHERE id_servicio = ?',
                    [servicioId]
                );
                if (servicio.length === 0) {
                    throw new Error(`Servicio con ID ${servicioId} no encontrado`);
                }
                await connection.query(
                    'INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, ?)',
                    [turnoId, servicioId]
                );
            }

            await connection.commit();

            try {
                const [serviciosData] = await connection.query(
                    'SELECT s.nombre FROM turno_servicio ts JOIN servicio s ON ts.id_servicio = s.id_servicio WHERE ts.id_turno = ?',
                    [turnoId]
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
                                <p><strong>Número:</strong> #${turnoId}</p>
                                <p><strong>Fecha:</strong> ${turno.fecha}</p>
                                <p><strong>Hora:</strong> ${turno.hora}</p>
                                <p><strong>Servicios:</strong> ${nombresServicios}</p>
                                <p><strong>Duración:</strong> ${turno.duracionTotal} min</p>
                                <p><strong>Total:</strong> $${parseFloat(turno.precioTotal).toFixed(2)}</p>
                                <p><strong>Método:</strong> ${turno.metodoPago}</p>
                            </div>
                            <p>Gracias por elegir Sentirse Bien Spa. ¡Te esperamos!</p>
                        </div>`
                };

                await transporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error('Error al enviar correo:', emailError);
            }

            res.status(201).json({
                success: true,
                message: 'Reserva registrada exitosamente',
                turnoId
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

router.put('/cancelar/:id_turno', verifyToken, async (req, res) => {
    try {
        const idTurno = req.params.id_turno;
        if (req.user.role !== 'cliente') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        const [turnos] = await db.query(
            'SELECT * FROM turno WHERE id_turno = ? AND id_cliente = ?',
            [idTurno, req.user.id]
        );
        if (turnos.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado o no autorizado' });
        }

        const turno = turnos[0];
        const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora}`);
        const ahora = new Date();
        const diffHoras = (fechaHoraTurno - ahora) / (1000 * 60 * 60);

        if (diffHoras < 24) {
            return res.status(400).json({
                error: 'No puedes cancelar el turno con menos de 24 horas de anticipación.'
            });
        }

        await db.query(
            "UPDATE turno SET estado = 'cancelado' WHERE id_turno = ?",
            [idTurno]
        );
        res.json({ success: true, message: 'Turno cancelado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cancelar el turno' });
    }
});

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

module.exports = router;