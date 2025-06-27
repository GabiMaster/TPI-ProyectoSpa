const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('spa.db');

console.log('Verificando turnos con estado "atendido"...\n');

db.all('SELECT id, estado, fecha, hora, cliente_id FROM turno WHERE estado = "atendido" ORDER BY fecha DESC, hora DESC LIMIT 10', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Turnos con estado "atendido":');
        console.table(rows);
    }
    
    // También verificar todos los estados disponibles
    db.all('SELECT DISTINCT estado, COUNT(*) as count FROM turno GROUP BY estado', (err, estados) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('\nResumen de estados:');
            console.table(estados);
        }
        db.close();
    });
});
