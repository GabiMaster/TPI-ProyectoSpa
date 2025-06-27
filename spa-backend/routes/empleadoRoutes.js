const express = require('express');
const db = require('../db');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

// Endpoint para obtener todos los empleados (solo admin)
router.get('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden ver empleados' });
        }

        const [empleados] = await db.query(`
            SELECT id_empleado, nombre, apellido, email, telefono, puesto
            FROM empleado
            ORDER BY nombre, apellido
        `);

        res.json(empleados);
    } catch (error) {
        console.error('Error al obtener empleados:', error);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
});

// Endpoint para obtener un empleado específico
router.get('/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden ver empleados' });
        }

        const [empleado] = await db.query(`
            SELECT id_empleado, nombre, apellido, email, telefono, puesto
            FROM empleado
            WHERE id_empleado = ?
        `, [req.params.id]);

        if (empleado.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json(empleado[0]);
    } catch (error) {
        console.error('Error al obtener empleado:', error);
        res.status(500).json({ error: 'Error al obtener empleado' });
    }
});

module.exports = router;
