const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const { sendInvitationCode } = require('../utils/mailer');
const EmpleadoScheduleManager = require('../empleadoScheduleManager');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'tu_clave_secreta';

// Instancia del gestor de horarios de empleados
const empleadoScheduleManager = new EmpleadoScheduleManager();

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
    console.log('🔒 Usuario autenticado:', req.user?.role);
    
    const { servicios, empleados, fecha, hora_inicio, hora_fin, precio_total, duracion_total } = req.body;
    
    console.log('📋 Datos recibidos:');
    console.log('   - servicios:', servicios, '(tipo:', typeof servicios, ', array:', Array.isArray(servicios), ')');
    console.log('   - empleados:', empleados, '(tipo:', typeof empleados, ', array:', Array.isArray(empleados), ')');
    console.log('   - fecha:', fecha, '(tipo:', typeof fecha, ')');
    console.log('   - hora_inicio:', hora_inicio, '(tipo:', typeof hora_inicio, ')');
    console.log('   - hora_fin:', hora_fin, '(tipo:', typeof hora_fin, ')');
    console.log('   - precio_total:', precio_total, '(tipo:', typeof precio_total, ')');
    console.log('   - duracion_total:', duracion_total, '(tipo:', typeof duracion_total, ')');

    if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        console.log('❌ Error: Servicios inválidos');
        return res.status(400).json({ error: 'Debe seleccionar al menos un servicio.' });
    }
    if (!empleados || !Array.isArray(empleados) || empleados.length === 0) {
        console.log('❌ Error: Empleados inválidos');
        return res.status(400).json({ error: 'Debe seleccionar al menos un empleado.' });
    }
    if (!fecha || !hora_inicio || !hora_fin || precio_total === undefined || precio_total === null || isNaN(precio_total) || duracion_total === undefined || isNaN(duracion_total)) {
        console.log('❌ Error: Faltan datos obligatorios');
        console.log('   fecha:', !!fecha, '(valor:', fecha, ')');
        console.log('   hora_inicio:', !!hora_inicio, '(valor:', hora_inicio, ')');
        console.log('   hora_fin:', !!hora_fin, '(valor:', hora_fin, ')');
        console.log('   precio_total:', precio_total !== undefined && precio_total !== null && !isNaN(precio_total), '(valor:', precio_total, ', tipo:', typeof precio_total, ', isNaN:', isNaN(precio_total), ')');
        console.log('   duracion_total:', duracion_total !== undefined && !isNaN(duracion_total), '(valor:', duracion_total, ', tipo:', typeof duracion_total, ', isNaN:', isNaN(duracion_total), ')');
        
        const missingFields = [];
        if (!fecha) missingFields.push('fecha');
        if (!hora_inicio) missingFields.push('hora_inicio');
        if (!hora_fin) missingFields.push('hora_fin');
        if (precio_total === undefined || precio_total === null || isNaN(precio_total)) missingFields.push('precio_total');
        if (duracion_total === undefined || isNaN(duracion_total)) missingFields.push('duracion_total');
        
        return res.status(400).json({ 
            error: 'Faltan datos obligatorios.',
            missingFields: missingFields,
            receivedData: { fecha, hora_inicio, hora_fin, precio_total, duracion_total }
        });
    }

    try {
        // VALIDAR CONFLICTOS DE HORARIO ANTES DE CREAR
        console.log('🔍 Validando disponibilidad de empleados...');
        console.log(`📋 Datos de validación: empleados=${empleados}, fecha=${fecha}, hora=${hora_inicio}-${hora_fin}`);
        
        const validacion = await empleadoScheduleManager.verificarDisponibilidadMultiple(
            empleados, fecha, hora_inicio, hora_fin
        );
        
        console.log('📊 Resultado de validación:', {
            disponibles: validacion.disponibles.length,
            conflictos: validacion.conflictos.length
        });

        if (validacion.conflictos.length > 0) {
            console.log('❌ Conflictos detectados:', validacion.conflictos);
            return res.status(400).json({
                error: 'Conflicto de horarios detectado',
                mensaje: 'Uno o más empleados ya tienen turnos asignados en este horario',
                conflictos: validacion.conflictos.map(conflicto => ({
                    empleado: conflicto.nombre,
                    mensaje: conflicto.mensaje,
                    turnosConflictivos: conflicto.turnosConflictivos
                })),
                empleadosDisponibles: validacion.disponibles.map(emp => emp.nombre),
                empleadosConConflicto: validacion.conflictos.map(emp => emp.nombre)
            });
        }

        console.log('✅ Todos los empleados están disponibles. Procediendo con la creación...');

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const turnosCreados = [];

            for (const id_empleado of empleados) {
                // Insertar turno (sin cliente, estado disponible)
                const [result] = await conn.query(
                    `INSERT INTO turno (id_cliente, fecha, hora, hora_fin, precio_total, duracion_total, estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [null, fecha, hora_inicio, hora_fin, precio_total, duracion_total, 'disponible']
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

                turnosCreados.push({
                    id_turno,
                    id_empleado,
                    fecha,
                    hora_inicio,
                    hora_fin
                });
            }

            await conn.commit();
            
            console.log('✅ Turnos creados exitosamente:', turnosCreados);
            res.status(201).json({ 
                message: 'Turno(s) creado(s) correctamente sin conflictos de horario.',
                turnosCreados,
                empleadosAsignados: validacion.disponibles.length
            });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } catch (err) {
        console.error('Error al crear turno:', err);
        res.status(500).json({ error: err.message });
    }
});

// Obtener todos los turnos disponibles para administradores (DEBE IR ANTES QUE /turnos/:id)
router.get('/turnos/disponibles-admin', verifyToken, verifyAdmin, async (req, res) => {
    const db = require('../db');
    
    try {
        console.log('🔍 Obteniendo turnos disponibles para admin...');
        
        // Consulta completa con servicios y empleados
        const [turnos] = await db.query(`
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora as hora_inicio,
                t.hora_fin,
                t.duracion_total,
                t.precio_total,
                t.estado,
                t.fecha_reserva,
                GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') as servicios,
                GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido) SEPARATOR ', ') as empleados,
                CASE 
                    WHEN c.nombre IS NOT NULL THEN CONCAT(c.nombre, ' ', c.apellido)
                    ELSE 'Sin cliente asignado'
                END as cliente
            FROM turno t
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            LEFT JOIN cliente c ON t.id_cliente = c.id_cliente
            WHERE t.estado IN ('disponible', 'reservado', 'pendiente')
            GROUP BY t.id_turno
            ORDER BY t.fecha ASC, t.hora ASC
            LIMIT 50
        `);
        
        console.log(`✅ Encontrados ${turnos.length} turnos disponibles`);
        
        // Formatear los datos para el frontend
        const turnosFormateados = turnos.map(turno => {
            const fecha = turno.fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            const horaInicio = turno.hora_inicio ? turno.hora_inicio.toString().substring(0, 5) : 'No especificada';
            const horaFin = turno.hora_fin ? turno.hora_fin.toString().substring(0, 5) : '';
            
            return {
                ...turno,
                fecha: fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                servicios: turno.servicios || 'Sin servicios asignados',
                empleados: turno.empleados || 'Sin empleados asignados',
                cliente: turno.cliente || 'Sin cliente asignado'
            };
        });
        
        res.json(turnosFormateados);
        
    } catch (error) {
        console.error('❌ Error al obtener turnos disponibles:', error);
        res.status(500).json({ error: 'Error al obtener turnos disponibles' });
    }
});

// Obtener un turno específico por ID para edición
router.get('/turnos/:id', verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const db = require('../db');
    
    try {
        console.log('🔍 Obteniendo turno ID:', id);
        
        const [turno] = await db.query(`
            SELECT 
                t.id_turno,
                t.fecha,
                t.hora as hora_inicio,
                t.hora_fin,
                t.duracion_total,
                t.precio_total,
                t.estado,
                GROUP_CONCAT(DISTINCT s.id_servicio) as servicios_ids,
                GROUP_CONCAT(DISTINCT s.nombre) as servicios_nombres,
                GROUP_CONCAT(DISTINCT e.id_empleado) as empleados_ids,
                GROUP_CONCAT(DISTINCT CONCAT(e.nombre, ' ', e.apellido)) as empleados_nombres
            FROM turno t
            LEFT JOIN turno_servicio ts ON t.id_turno = ts.id_turno
            LEFT JOIN servicio s ON ts.id_servicio = s.id_servicio
            LEFT JOIN turno_empleado te ON t.id_turno = te.id_turno
            LEFT JOIN empleado e ON te.id_empleado = e.id_empleado
            WHERE t.id_turno = ?
            GROUP BY t.id_turno
        `, [id]);
        
        if (!turno || turno.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }
        
        const turnoData = {
            ...turno[0],
            servicios: turno[0].servicios_ids ? turno[0].servicios_ids.split(',').map(Number) : [],
            empleados: turno[0].empleados_ids ? turno[0].empleados_ids.split(',').map(Number) : []
        };
        
        console.log('✅ Turno encontrado:', turnoData);
        res.json(turnoData);
        
    } catch (error) {
        console.error('❌ Error al obtener turno:', error);
        res.status(500).json({ error: 'Error al obtener el turno' });
    }
});

// Actualizar un turno existente
router.put('/turnos/:id', verifyToken, verifyAdmin, async (req, res) => {
    console.log('📝 PUT /api/admin/turnos/:id BODY:', req.body);
    console.log('🔒 Usuario autenticado:', req.user?.role);
    
    const { id } = req.params;
    const { servicios, empleados, fecha, hora_inicio, hora_fin, precio_total, duracion_total } = req.body;
    
    console.log('📋 Datos recibidos para actualización:');
    console.log('   - turno_id:', id);
    console.log('   - servicios:', servicios, '(tipo:', typeof servicios, ', array:', Array.isArray(servicios), ')');
    console.log('   - empleados:', empleados, '(tipo:', typeof empleados, ', array:', Array.isArray(empleados), ')');
    console.log('   - fecha:', fecha, '(tipo:', typeof fecha, ')');
    console.log('   - hora_inicio:', hora_inicio, '(tipo:', typeof hora_inicio, ')');
    console.log('   - hora_fin:', hora_fin, '(tipo:', typeof hora_fin, ')');
    console.log('   - precio_total:', precio_total, '(tipo:', typeof precio_total, ')');
    console.log('   - duracion_total:', duracion_total, '(tipo:', typeof duracion_total, ')');

    // Validaciones
    if (!servicios || !Array.isArray(servicios) || servicios.length === 0) {
        console.log('❌ Error: Servicios inválidos');
        return res.status(400).json({ error: 'Debe seleccionar al menos un servicio.' });
    }
    if (!empleados || !Array.isArray(empleados) || empleados.length === 0) {
        console.log('❌ Error: Empleados inválidos');
        return res.status(400).json({ error: 'Debe seleccionar al menos un empleado.' });
    }
    if (!fecha || !hora_inicio || !hora_fin || precio_total === undefined || precio_total === null || isNaN(precio_total) || duracion_total === undefined || isNaN(duracion_total)) {
        console.log('❌ Error: Faltan datos obligatorios para actualización');
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    try {
        const db = require('../db');
        
        // Verificar que el turno existe
        const [turnoExistente] = await db.query('SELECT * FROM turno WHERE id_turno = ?', [id]);
        if (turnoExistente.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }
        
        console.log('🔄 Actualizando turno...');
        
        // Actualizar datos básicos del turno
        await db.query(`
            UPDATE turno 
            SET fecha = ?, hora = ?, hora_fin = ?, duracion_total = ?, precio_total = ?, fecha_modificacion = NOW()
            WHERE id_turno = ?
        `, [fecha, hora_inicio, hora_fin, duracion_total, precio_total, id]);
        
        // Actualizar servicios del turno
        await db.query('DELETE FROM turno_servicio WHERE id_turno = ?', [id]);
        for (const servicioId of servicios) {
            await db.query('INSERT INTO turno_servicio (id_turno, id_servicio) VALUES (?, ?)', [id, servicioId]);
        }
        
        // Actualizar empleados del turno
        await db.query('DELETE FROM turno_empleado WHERE id_turno = ?', [id]);
        for (const empleadoId of empleados) {
            await db.query('INSERT INTO turno_empleado (id_turno, id_empleado) VALUES (?, ?)', [id, empleadoId]);
        }
        
        console.log('✅ Turno actualizado exitosamente');
        res.json({ 
            success: true, 
            message: 'Turno actualizado exitosamente',
            turno_id: id
        });
        
    } catch (error) {
        console.error('❌ Error al actualizar turno:', error);
        res.status(500).json({ error: 'Error al actualizar el turno' });
    }
});

// Eliminar un turno existente
router.delete('/turnos/:id', verifyToken, verifyAdmin, async (req, res) => {
    console.log('🗑️ DELETE /api/admin/turnos/:id');
    console.log('🔒 Usuario autenticado:', req.user?.role);
    
    const { id } = req.params;
    const db = require('../db');
    
    try {
        console.log('🗑️ Eliminando turno ID:', id);
        
        // Verificar que el turno existe
        const [turnoExistente] = await db.query('SELECT * FROM turno WHERE id_turno = ?', [id]);
        if (turnoExistente.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }
        
        console.log('🔄 Eliminando relaciones del turno...');
        
        // Eliminar las relaciones del turno primero (para evitar errores de foreign key)
        await db.query('DELETE FROM turno_servicio WHERE id_turno = ?', [id]);
        await db.query('DELETE FROM turno_empleado WHERE id_turno = ?', [id]);
        await db.query('DELETE FROM turno_combo WHERE id_turno = ?', [id]);
        
        // Eliminar el turno
        await db.query('DELETE FROM turno WHERE id_turno = ?', [id]);
        
        console.log('✅ Turno eliminado exitosamente');
        res.json({ 
            success: true, 
            message: `Turno ID ${id} eliminado exitosamente`
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar turno:', error);
        res.status(500).json({ error: 'Error al eliminar el turno' });
    }
});

// ==================== GESTIÓN DE EMPLEADOS ====================

module.exports = router;