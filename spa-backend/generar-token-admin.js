const jwt = require('jsonwebtoken');

// Generar token de admin válido
const token = jwt.sign({
    id: 1,
    email: 'admin@spa.com',
    role: 'admin'
}, 'tu_clave_secreta', { expiresIn: '1h' });

console.log('Token de admin generado:');
console.log(token);

// Verificar que el token se puede decodificar
try {
    const decoded = jwt.verify(token, 'tu_clave_secreta');
    console.log('\nToken decodificado:');
    console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
    console.error('Error al decodificar token:', error);
}
