const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

// Cargar variables de entorno desde archivo .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../spa-frontend')));

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const empleadoRoutes = require('./routes/empleadoRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const comboRoutes = require('./routes/comboRoutes');
const turnoRoutes = require('./routes/turnoRoutes');

// Importar sistemas de gestión
const TurnoStatusManager = require('./turnoStatusManager');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/turnos', turnoRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: 'API del Spa funcionando correctamente', 
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            client: '/api/client',
            admin: '/api/admin',
            empleados: '/api/empleados',
            servicios: '/api/servicios',
            combos: '/api/combos',
            turnos: '/api/turnos'
        }
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal en el servidor!' });
});

// Manejo de rutas no encontradas para API
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Servir el index.html para todas las demás rutas (SPA)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../spa-frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en: http://localhost:${PORT}`);
    console.log(`🔍 Documentación en: http://localhost:${PORT}`);
    
    // Inicializar sistema de gestión automática de turnos
    console.log('\n🔧 Inicializando sistemas automáticos...');
    const turnoManager = new TurnoStatusManager();
    turnoManager.iniciarActualizacionAutomatica();
    console.log('✅ Sistema de monitoreo de turnos activado\n');
});

module.exports = app;
