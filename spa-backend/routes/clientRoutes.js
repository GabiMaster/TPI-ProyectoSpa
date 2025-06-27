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

module.exports = router;