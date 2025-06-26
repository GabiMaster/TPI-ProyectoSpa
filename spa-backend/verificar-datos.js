const db = require('./db');

async function verificarServicios() {
    try {
        console.log('Verificando servicios disponibles...');
        
        const [servicios] = await db.query('SELECT id_servicio, nombre, categoria FROM servicio ORDER BY categoria, nombre');
        
        if (servicios.length === 0) {
            console.log('No hay servicios en la base de datos.');
        } else {
            console.log('Servicios disponibles:');
            servicios.forEach(s => {
                console.log(`- ID: ${s.id_servicio}, Nombre: ${s.nombre}, Categoría: ${s.categoria}`);
            });
        }
        
        const [empleados] = await db.query('SELECT id_empleado, nombre, apellido, puesto FROM empleado LIMIT 5');
        
        if (empleados.length === 0) {
            console.log('No hay empleados en la base de datos.');
        } else {
            console.log('\nEmpleados disponibles:');
            empleados.forEach(e => {
                console.log(`- ID: ${e.id_empleado}, Nombre: ${e.nombre} ${e.apellido}, Puesto: ${e.puesto}`);
            });
        }
        
    } catch (error) {
        console.error('Error al verificar datos:', error);
    } finally {
        process.exit(0);
    }
}

verificarServicios();
