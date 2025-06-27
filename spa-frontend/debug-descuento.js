// Función de debug para verificar el descuento
console.log('=== DEBUG: Verificando descuento ===');

// Simular los datos del turno 197
const fecha = '2025-06-30';
const hora = '10:00';
const precioTotal = 110;

console.log('Datos del turno:');
console.log('- Fecha:', fecha);
console.log('- Hora:', hora);
console.log('- Precio total:', precioTotal);

// Calcular diferencia de horas
const fechaTurno = new Date(`${fecha}T${hora}`);
const ahora = new Date();
const diffHoras = (fechaTurno - ahora) / (1000 * 60 * 60);

console.log('\nCálculo de tiempo:');
console.log('- Fecha/hora turno:', fechaTurno);
console.log('- Fecha/hora actual:', ahora);
console.log('- Diferencia en horas:', diffHoras);
console.log('- Es mayor a 48 horas?', diffHoras > 48);

// Simular descuento
if (diffHoras > 48) {
    const descuento = precioTotal * 0.15;
    const precioFinal = precioTotal - descuento;
    
    console.log('\n✅ DESCUENTO APLICABLE:');
    console.log('- Descuento (15%):', descuento);
    console.log('- Precio final:', precioFinal);
} else {
    console.log('\n❌ NO APLICA DESCUENTO');
    console.log('- Motivo: Diferencia de horas menor a 48');
}

console.log('\n=== FIN DEBUG ===');
