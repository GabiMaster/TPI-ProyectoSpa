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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Endpoint para obtener TODOS los turnos disponibles
router.get('/disponibles', async (req, res) => {
    try {
        const query = `SELECT t.id_turno, t.fecha, t.hora, t.hora_fin, t.precio_total, t.duracion_total,
                              (SELECT GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') 
                               FROM turno_servicio ts 
                               JOIN servicio s ON ts.id_servicio = s.id_servicio 
                               WHERE ts.id_turno = t.id_turno) AS servicios,
                              (SELECT GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') 
                               FROM turno_empleado te 
                               JOIN empleado e ON te.id_empleado = e.id_empleado 
                               WHERE te.id_turno = t.id_turno) AS empleados,
                              (SELECT GROUP_CONCAT(DISTINCT s.categoria SEPARATOR ', ') 
                               FROM turno_servicio ts 
                               JOIN servicio s ON ts.id_servicio = s.id_servicio 
                               WHERE ts.id_turno = t.id_turno) AS categorias
                       FROM turno t
                       WHERE t.estado = 'disponible'
                       AND t.fecha >= CURDATE()
                       ORDER BY t.fecha, t.hora`;

        const [turnos] = await db.query(query);
        res.json(turnos);
    } catch (error) {
        console.error('Error al obtener todos los turnos disponibles:', error);
        res.status(500).json({ error: 'Error al obtener turnos disponibles' });
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
    console.log('=== DATOS RECIBIDOS EN RESERVA ===');
    console.log('Datos completos:', JSON.stringify(req.body, null, 2));
    console.log('Método de pago recibido:', req.body.turno?.metodoPago);
    console.log('=====================================');
    try {
        const { turno, tarjeta } = req.body;
        const clienteId = req.user.id;

        // Validar datos básicos
        if (!turno || !turno.id_turno) {
            return res.status(400).json({ error: 'ID de turno requerido' });
        }

        // Verificar que el usuario sea cliente
        if (req.user.role !== 'cliente') {
            return res.status(403).json({ error: 'Solo los clientes pueden reservar turnos' });
        }

        // Si hay datos de tarjeta y se solicita guardarla
        if (tarjeta && tarjeta.guardar) {
            try {
                // Crear tabla si no existe
                await db.query(`
                    CREATE TABLE IF NOT EXISTS tarjetas_debito (
                        id_tarjeta INT AUTO_INCREMENT PRIMARY KEY,
                        id_cliente INT NOT NULL,
                        numero_tarjeta VARCHAR(16) NOT NULL,
                        titular VARCHAR(100) NOT NULL,
                        vencimiento VARCHAR(5) NOT NULL,
                        dni_titular VARCHAR(20) NOT NULL,
                        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                        activa BOOLEAN DEFAULT TRUE,
                        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE CASCADE,
                        INDEX idx_cliente (id_cliente)
                    )
                `);

                // Desactivar tarjetas existentes
                await db.query(
                    'UPDATE tarjetas_debito SET activa = FALSE WHERE id_cliente = ?',
                    [clienteId]
                );

                // Guardar nueva tarjeta
                await db.query(
                    'INSERT INTO tarjetas_debito (id_cliente, numero_tarjeta, titular, vencimiento, dni_titular) VALUES (?, ?, ?, ?, ?)',
                    [clienteId, tarjeta.numero, tarjeta.titular, tarjeta.vencimiento, tarjeta.dni_titular]
                );

                console.log('Tarjeta guardada exitosamente para cliente:', clienteId);
            } catch (err) {
                console.error('Error al guardar tarjeta:', err);
                // No fallar la reserva por error al guardar tarjeta
            }
        }

        // Usar el gestor de turnos para reservar
        await turnoManager.reservarTurno(turno.id_turno, clienteId, turno.metodoPago || 'efectivo');

        // Si hay descuento aplicado, actualizar el turno con la información
        if (turno.descuentoAplicado && turno.descuentoAplicado > 0) {
            const precioFinal = turno.precioOriginal - turno.descuentoAplicado;
            await db.query(`
                UPDATE turno 
                SET precio_original = ?, descuento_aplicado = ?, precio_final = ?
                WHERE id_turno = ?
            `, [turno.precioOriginal, turno.descuentoAplicado, precioFinal, turno.id_turno]);
            
            console.log(`💰 Descuento aplicado: $${turno.descuentoAplicado} - Precio final: $${precioFinal} (turno ${turno.id_turno})`);
        }

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

        // Preparar información de precio y descuento
        let precioInfo;
        if (turnoInfo.precio_final && turnoInfo.precio_final > 0 && turnoInfo.descuento_aplicado > 0) {
            // Turno con descuento
            precioInfo = `
                <p><strong>Precio original:</strong> $${turnoInfo.precio_original}</p>
                <p style="color: #28a745;"><strong>Descuento aplicado (15% - Débito + 48h):</strong> -$${turnoInfo.descuento_aplicado}</p>
                <p style="color: #007bff; font-size: 18px;"><strong>Precio final:</strong> $${turnoInfo.precio_final}</p>
            `;
        } else {
            // Turno sin descuento
            precioInfo = `<p><strong>Precio:</strong> $${turnoInfo.precio_total}</p>`;
        }

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
                        ${precioInfo}
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

// Endpoint para obtener cronograma de un empleado en una fecha específica
router.get('/cronograma/:empleadoId/:fecha', verifyToken, async (req, res) => {
    const { empleadoId, fecha } = req.params;
    
    console.log('Obteniendo cronograma para empleado:', empleadoId, 'fecha:', fecha);
    
    try {
        // Consulta para obtener todos los turnos del empleado en la fecha especificada
        const query = `
            SELECT 
                t.id_turno,
                t.fecha,
                TIME_FORMAT(t.hora, '%H:%i') as hora_inicio,
                TIME_FORMAT(t.hora_fin, '%H:%i') as hora_fin,
                t.estado,
                t.precio_total,
                t.duracion_total,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                GROUP_CONCAT(DISTINCT s.nombre ORDER BY s.nombre SEPARATOR ', ') as servicios,
                GROUP_CONCAT(DISTINCT CONCAT(e2.nombre, ' ', e2.apellido) ORDER BY e2.nombre SEPARATOR ', ') as otros_empleados
            FROM turno t
            LEFT JOIN cliente c ON t.id_cliente = c.id_cliente
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e2 ON te.id_empleado = e2.id_empleado AND e2.id_empleado != ?
            WHERE t.id_turno IN (
                SELECT DISTINCT te2.id_turno 
                FROM turno_empleado te2 
                WHERE te2.id_empleado = ?
            )
            AND t.fecha = ?
            GROUP BY t.id_turno, t.fecha, t.hora, t.hora_fin, t.estado, t.precio_total, t.duracion_total, c.nombre, c.apellido, c.telefono, c.email
            ORDER BY t.hora
        `;
        
        const [turnos] = await db.query(query, [empleadoId, empleadoId, fecha]);
        
        console.log('Turnos encontrados para cronograma:', turnos.length);
        
        // Obtener información del empleado
        const [empleadoInfo] = await db.query(
            'SELECT nombre, apellido FROM empleado WHERE id_empleado = ?',
            [empleadoId]
        );
        
        if (empleadoInfo.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        res.json({
            empleado: empleadoInfo[0],
            fecha: fecha,
            turnos: turnos
        });
        
    } catch (error) {
        console.error('Error al obtener cronograma:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para verificar disponibilidad de empleados en un horario específico
router.post('/verificar-empleados', verifyToken, async (req, res) => {
    const { empleadosIds, fecha, horaInicio, horaFin } = req.body;
    
    console.log('Verificando empleados:', empleadosIds, 'fecha:', fecha, 'horario:', horaInicio, '-', horaFin);
    
    try {
        if (!empleadosIds || !Array.isArray(empleadosIds) || empleadosIds.length === 0) {
            return res.status(400).json({ error: 'Debe proporcionar al menos un empleado' });
        }
        
        if (!fecha || !horaInicio || !horaFin) {
            return res.status(400).json({ error: 'Debe proporcionar fecha, hora de inicio y hora de fin' });
        }
        
        // Verificar disponibilidad de cada empleado
        const resultados = [];
        
        for (const empleadoId of empleadosIds) {
            // Obtener información del empleado
            const [empleadoInfo] = await db.query(
                'SELECT nombre, apellido FROM empleado WHERE id_empleado = ?',
                [empleadoId]
            );
            
            if (empleadoInfo.length === 0) {
                resultados.push({
                    empleadoId,
                    empleado: 'Empleado no encontrado',
                    disponible: false,
                    razon: 'Empleado no existe'
                });
                continue;
            }
            
            // Verificar si tiene turnos en conflicto
            const [turnosConflicto] = await db.query(`
                SELECT t.id_turno, t.hora, t.hora_fin, t.estado,
                       GROUP_CONCAT(DISTINCT s.nombre ORDER BY s.nombre SEPARATOR ', ') as servicios
                FROM turno t
                JOIN turno_empleado te ON t.id_turno = te.id_turno
                LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
                LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
                WHERE te.id_empleado = ?
                AND t.fecha = ?
                AND t.estado IN ('disponible', 'reservado', 'confirmado')
                AND (
                    (TIME(?) < TIME(t.hora_fin) AND TIME(?) > TIME(t.hora))
                )
                GROUP BY t.id_turno, t.hora, t.hora_fin, t.estado
                ORDER BY t.hora
            `, [empleadoId, fecha, horaInicio, horaFin]);
            
            const empleadoData = empleadoInfo[0];
            const nombreCompleto = `${empleadoData.nombre} ${empleadoData.apellido}`;
            
            if (turnosConflicto.length > 0) {
                resultados.push({
                    empleadoId,
                    empleado: nombreCompleto,
                    disponible: false,
                    razon: `Tiene ${turnosConflicto.length} turno(s) en conflicto`,
                    turnosConflicto: turnosConflicto.map(turno => ({
                        id: turno.id_turno,
                        horario: `${turno.hora.substring(0, 5)} - ${turno.hora_fin.substring(0, 5)}`,
                        servicios: turno.servicios,
                        estado: turno.estado
                    }))
                });
            } else {
                resultados.push({
                    empleadoId,
                    empleado: nombreCompleto,
                    disponible: true,
                    razon: 'Disponible en el horario solicitado'
                });
            }
        }
        
        // Procesar resultados para el formato esperado por el frontend
        const disponibles = [];
        const noDisponibles = [];
        
        for (const resultado of resultados) {
            if (resultado.disponible) {
                disponibles.push({
                    id: resultado.empleadoId,
                    nombre: resultado.empleado
                });
            } else {
                noDisponibles.push({
                    id: resultado.empleadoId,
                    nombre: resultado.empleado,
                    razon: resultado.razon,
                    conflictos: resultado.turnosConflicto || []
                });
            }
        }
        
        const totalEmpleados = empleadosIds.length;
        const disponiblesCount = disponibles.length;
        const noDisponiblesCount = noDisponibles.length;
        
        res.json({
            mensaje: `Validación completada: ${disponiblesCount}/${totalEmpleados} empleados disponibles para ${fecha} de ${horaInicio} a ${horaFin}`,
            fecha: fecha,
            horario: `${horaInicio} - ${horaFin}`,
            disponibles: disponibles,
            noDisponibles: noDisponibles,
            totalEmpleados: totalEmpleados,
            disponiblesCount: disponiblesCount,
            noDisponiblesCount: noDisponiblesCount
        });
        
    } catch (error) {
        console.error('Error al verificar empleados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener historial de turnos de un cliente
router.get('/historial', verifyToken, async (req, res) => {
    try {
        const clienteId = req.user.id;
        
        console.log('Obteniendo historial de turnos para cliente:', clienteId);
        
        const query = `
            SELECT 
                t.id_turno,
                t.fecha,
                TIME_FORMAT(t.hora, '%H:%i') as hora_inicio,
                TIME_FORMAT(t.hora_fin, '%H:%i') as hora_fin,
                t.estado,
                t.precio_total,
                t.precio_original,
                t.descuento_aplicado,
                t.precio_final,
                CASE 
                    WHEN t.precio_final IS NOT NULL AND t.precio_final > 0 THEN t.precio_final
                    ELSE t.precio_total
                END as precio_mostrar,
                t.metodo_pago,
                t.duracion_total,
                GROUP_CONCAT(DISTINCT s.nombre ORDER BY s.nombre SEPARATOR ', ') as servicios,
                GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) ORDER BY e.nombre SEPARATOR ', ') as empleados
            FROM turno t
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_cliente = ?
            GROUP BY t.id_turno, t.fecha, t.hora, t.hora_fin, t.estado, t.precio_total, t.precio_original, t.descuento_aplicado, t.precio_final, t.metodo_pago, t.duracion_total
            ORDER BY t.fecha DESC, t.hora DESC
        `;
        
        const [turnos] = await db.query(query, [clienteId]);
        
        console.log('Turnos encontrados para cliente:', turnos.length);
        
        res.json(turnos);
        
    } catch (error) {
        console.error('Error al obtener historial de turnos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener historial completo de turnos (para administradores)
router.get('/historial-completo', verifyToken, async (req, res) => {
    try {
        console.log('Obteniendo historial completo de turnos');
        
        let query = `
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora as hora_inicio,
                t.hora_fin,
                t.estado,
                t.precio_total,
                t.fecha_reserva as fecha_creacion,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.email as cliente_email,
                GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados,
                GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios
            FROM turno t
            LEFT JOIN cliente c ON t.id_cliente = c.id_cliente
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
        `;
        
        const queryParams = [];
        
        // Filtrar por estado si se especifica
        if (req.query.estado && req.query.estado !== 'todos') {
            query += ' WHERE t.estado = ?';
            queryParams.push(req.query.estado);
        }
        
        query += ' GROUP BY t.id_turno ORDER BY t.fecha DESC, t.hora DESC';
        
        const [turnos] = await db.query(query, queryParams);
        
        console.log('Turnos encontrados en historial completo:', turnos.length);
        
        res.json(turnos);
        
    } catch (error) {
        console.error('Error al obtener historial completo de turnos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// Cancelar turno (con regla de 48h)
router.put('/cancelar/:id', verifyToken, async (req, res) => {
    try {
        const turnoId = req.params.id;
        const usuarioId = req.user.id;
        const esAdmin = req.user.role === 'admin';
        
        const turnoManager = new TurnoStatusManager();
        const resultado = await turnoManager.cancelarTurno(turnoId, usuarioId, esAdmin);
        
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Error al cancelar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Reservar turno (con regla de 48h)
router.put('/reservar/:id', verifyToken, async (req, res) => {
    try {
        const turnoId = req.params.id;
        const clienteId = req.user.id;
        const esAdmin = req.user.role === 'admin';
        
        const turnoManager = new TurnoStatusManager();
        const resultado = await turnoManager.reservarTurno(turnoId, clienteId, esAdmin);
        
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Error al reservar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Confirmar turno como atendido (solo admin)
router.put('/confirmar/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden confirmar turnos' });
        }
        
        const turnoId = req.params.id;
        const turnoManager = new TurnoStatusManager();
        const resultado = await turnoManager.confirmarTurno(turnoId);
        
        res.json(resultado);
        
    } catch (error) {
        console.error('❌ Error al confirmar turno:', error);
        res.status(400).json({ error: error.message });
    }
});

// Obtener estadísticas de turnos
router.get('/estadisticas', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden ver estadísticas' });
        }
        
        const turnoManager = new TurnoStatusManager();
        const estadisticas = await turnoManager.obtenerEstadisticas();
        
        res.json(estadisticas);
        
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
