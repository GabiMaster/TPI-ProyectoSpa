const express = require('express');
const app = express();

// Importar las rutas como lo hace el app principal
const clientRoutes = require('../routes/clientRoutes');

// Registrar las rutas
app.use('/api/clientes', clientRoutes);

// Listar todas las rutas registradas
function listRoutes() {
    console.log('📋 Rutas registradas en clientRoutes:');
    
    const routes = [];
    
    // Función recursiva para obtener todas las rutas
    function extractRoutes(stack, basePath = '') {
        for (const layer of stack) {
            if (layer.route) {
                // Es una ruta final
                const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
                routes.push(`${methods} ${basePath}${layer.route.path}`);
            } else if (layer.name === 'router') {
                // Es un router anidado
                const newBasePath = basePath + (layer.regexp.source.match(/^\^\\?(.+?)\\?\$$/) || ['', ''])[1].replace(/\\\//g, '/');
                extractRoutes(layer.handle.stack, newBasePath);
            }
        }
    }
    
    // Buscar el middleware de clientes
    for (const layer of app._router.stack) {
        if (layer.regexp.source.includes('api\\\/clientes')) {
            console.log('✅ Encontrado middleware de clientes');
            extractRoutes(layer.handle.stack, '/api/clientes');
            break;
        }
    }
    
    routes.forEach(route => console.log(`  ${route}`));
    console.log(`\n📊 Total rutas: ${routes.length}`);
}

listRoutes();
