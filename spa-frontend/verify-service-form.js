// Script de verificación para probar la edición de servicios
console.log('🔧 Verificando elementos del formulario de servicios...');

// Verificar que no existe el campo precio en servicios
const precioField = document.getElementById('precio');
if (precioField) {
    console.log('❌ ERROR: Aún existe el campo precio:', precioField);
} else {
    console.log('✅ Correcto: No existe el campo precio para servicios');
}

// Verificar los campos que sí deben existir
const requiredFields = ['nombre', 'descripcion', 'duracion', 'categoria'];
requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
        console.log(`✅ Campo ${fieldId}: ENCONTRADO`);
    } else {
        console.log(`❌ Campo ${fieldId}: NO ENCONTRADO`);
    }
});

console.log('✅ Verificación completada');
