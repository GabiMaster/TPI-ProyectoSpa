// Test para ejecutar en la consola del navegador
console.log('=== TEST CRONOGRAMA EN CONSOLA ===');

// Verificar que las variables estén disponibles
console.log('API_BASE_URL:', typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'NO DEFINIDO');
console.log('token:', typeof token !== 'undefined' ? (token ? 'PRESENTE' : 'AUSENTE') : 'NO DEFINIDO');

// Test de elementos HTML
const empleadoSelect = document.getElementById('schedule-empleado');
const fechaInput = document.getElementById('schedule-fecha');

console.log('Elemento empleado:', empleadoSelect);
console.log('Elemento fecha:', fechaInput);

if (empleadoSelect) console.log('Opciones empleado:', empleadoSelect.options.length);
if (fechaInput) console.log('Valor fecha:', fechaInput.value);

// Test del fetch
async function testFetchDirecto() {
    try {
        const empleadoId = 5;  // ID conocido que funciona
        const fecha = '2025-07-06';  // Fecha conocida que funciona
        
        console.log('Probando fetch directo...');
        console.log('URL:', `http://localhost:3000/api/turnos/cronograma/${empleadoId}/${fecha}`);
        
        const response = await fetch(`http://localhost:3000/api/turnos/cronograma/${empleadoId}/${fecha}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Datos recibidos:', data);
            console.log('Turnos:', data.turnos.length);
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }
    } catch (error) {
        console.error('Error en fetch:', error);
    }
}

// Ejecutar test
testFetchDirecto();
