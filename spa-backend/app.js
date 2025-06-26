const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const { sendInvitationCode } = require('./utils/mailer');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const comboRoutes = require('./routes/comboRoutes');

const app = express();

// Configuración básica
app.use(cors());
app.use(bodyParser.json());

// Middleware de logs
app.use((req, res, next) => {
    console.log(`Solicitud entrante: ${req.method} ${req.url}`);
    next();
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/admin', adminRoutes); // Esta línea es clave

// Ruta para manejar archivos HTML
const publicPath = path.join(__dirname, '../spa-frontend');
app.use(express.static(publicPath));

// Ruta 404 para APIs no encontradas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada' });
});

app.get(/^[^.]+$/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Generar código inicial (opcional)
const generateInitialCode = async () => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) AS count FROM administrador');
        if (rows[0].count === 0) {
            const codigo = crypto.randomBytes(16).toString('hex');
            await db.query('INSERT INTO codigo_invitacion (codigo) VALUES (?)', [codigo]);
            console.log('Código inicial generado:', codigo);
        }
    } catch (err) {
        console.error('Error al generar código:', err);
    }
};
generateInitialCode();