const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'tu_clave_secreta';

// Registro de clientes (público)
router.post('/register', async (req, res) => {
    const { nombre, apellido, email, telefono, contraseña } = req.body;

    try {
        // Verificar si el email ya existe en cualquier tabla
        const [existing] = await db.query(
            `SELECT email FROM (
                SELECT email FROM cliente
                UNION SELECT email FROM empleado
                UNION SELECT email FROM administrador
            ) AS all_users WHERE email = ?`, 
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        // Insertar cliente
        const [result] = await db.query(
            'INSERT INTO cliente (nombre, apellido, email, telefono, contraseña) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, email, telefono, hashedPassword]
        );

        // Generar token
        const token = jwt.sign(
            { 
                id: result.insertId, 
                email, 
                role: 'cliente' 
            },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.status(201).json({ 
            message: 'Cliente registrado exitosamente', 
            token 
        });
    } catch (err) {
        console.error('Error al registrar cliente:', err);
        res.status(500).json({ error: 'Error al registrar cliente' });
    }
});

// Obtener perfil del cliente autenticado (debe ir ANTES de /:id)
router.get('/perfil', verifyToken, async (req, res) => {
    try {
        const clienteId = req.user.id;
        
        console.log('Obteniendo perfil para cliente:', clienteId);
        
        const [cliente] = await db.query(
            'SELECT id_cliente, nombre, apellido, email, telefono FROM cliente WHERE id_cliente = ?',
            [clienteId]
        );
        
        if (cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        res.json(cliente[0]);
        
    } catch (error) {
        console.error('Error al obtener perfil de cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener datos de un cliente específico
router.get('/:id', verifyToken, async (req, res) => {
    try {
        console.log('Buscando cliente con ID:', req.params.id);
        console.log('Usuario autenticado:', req.user);
        
        const [rows] = await db.query('SELECT id_cliente, nombre, apellido, email, telefono FROM cliente WHERE id_cliente = ?', [req.params.id]);
        
        console.log('Resultados de la consulta:', rows);
        
        if (rows.length === 0) {
            console.log('Cliente no encontrado con ID:', req.params.id);
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        console.log('Cliente encontrado:', rows[0]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Error al obtener cliente:', err);
        res.status(500).json({ error: 'Error al obtener cliente' });
    }
});

// ==================== RUTAS PARA TARJETAS DE DÉBITO ====================

// Agregar/Actualizar tarjeta de débito
router.post('/:id/tarjeta', verifyToken, async (req, res) => {
    console.log('📝 DEBUG: Acceso a POST /:id/tarjeta, clienteId:', req.params.id);
    try {
        const clienteId = req.params.id;
        const { numero, titular, vencimiento, dni_titular } = req.body;

        // Verificar que el cliente autenticado es el mismo que el del parámetro
        if (req.user.role !== 'admin' && req.user.id != clienteId) {
            return res.status(403).json({ error: 'No tienes permisos para modificar esta información' });
        }

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

        // Verificar si ya existe una tarjeta para este cliente
        const [existing] = await db.query(
            'SELECT id_tarjeta FROM tarjetas_debito WHERE id_cliente = ? AND activa = TRUE',
            [clienteId]
        );

        if (existing.length > 0) {
            // Actualizar tarjeta existente
            await db.query(
                'UPDATE tarjetas_debito SET numero_tarjeta = ?, titular = ?, vencimiento = ?, dni_titular = ? WHERE id_cliente = ? AND activa = TRUE',
                [numero, titular, vencimiento, dni_titular, clienteId]
            );
            
            res.json({ message: 'Tarjeta actualizada exitosamente' });
        } else {
            // Insertar nueva tarjeta
            await db.query(
                'INSERT INTO tarjetas_debito (id_cliente, numero_tarjeta, titular, vencimiento, dni_titular) VALUES (?, ?, ?, ?, ?)',
                [clienteId, numero, titular, vencimiento, dni_titular]
            );
            
            res.status(201).json({ message: 'Tarjeta agregada exitosamente' });
        }
    } catch (err) {
        console.error('Error al guardar tarjeta:', err);
        res.status(500).json({ error: 'Error al guardar tarjeta de débito' });
    }
});

// Obtener tarjeta de débito del cliente
router.get('/:id/tarjeta', verifyToken, async (req, res) => {
    console.log('🔍 DEBUG: Acceso a GET /:id/tarjeta, clienteId:', req.params.id);
    try {
        const clienteId = req.params.id;

        // Verificar permisos
        if (req.user.role !== 'admin' && req.user.id != clienteId) {
            return res.status(403).json({ error: 'No tienes permisos para ver esta información' });
        }

        const [rows] = await db.query(
            'SELECT id_tarjeta, numero_tarjeta, titular, vencimiento, dni_titular, fecha_creacion FROM tarjetas_debito WHERE id_cliente = ? AND activa = TRUE ORDER BY fecha_creacion DESC LIMIT 1',
            [clienteId]
        );

        if (rows.length === 0) {
            return res.json({ tarjeta: null });
        }

        // Ocultar los primeros 12 dígitos de la tarjeta por seguridad
        const tarjeta = rows[0];
        tarjeta.numero_tarjeta = '**** **** **** ' + tarjeta.numero_tarjeta.slice(-4);

        res.json({ tarjeta });
    } catch (err) {
        console.error('Error al obtener tarjeta:', err);
        res.status(500).json({ error: 'Error al obtener tarjeta de débito' });
    }
});

// Eliminar tarjeta de débito
router.delete('/:id/tarjeta', verifyToken, async (req, res) => {
    try {
        const clienteId = req.params.id;

        // Verificar permisos
        if (req.user.role !== 'admin' && req.user.id != clienteId) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar esta información' });
        }

        await db.query(
            'UPDATE tarjetas_debito SET activa = FALSE WHERE id_cliente = ? AND activa = TRUE',
            [clienteId]
        );

        res.json({ message: 'Tarjeta eliminada exitosamente' });
    } catch (err) {
        console.error('Error al eliminar tarjeta:', err);
        res.status(500).json({ error: 'Error al eliminar tarjeta de débito' });
    }
});

module.exports = router;