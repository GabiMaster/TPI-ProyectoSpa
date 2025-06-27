const express = require('express');

// Hacer una petición HTTP simple al endpoint
async function testEndpoint() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('🔍 Probando endpoint de salud...');
    const healthResponse = await fetch('http://localhost:3000/');
    const healthText = await healthResponse.text();
    console.log('Health check:', healthText);
    
    console.log('\n🔐 Probando endpoint de login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'martinezgabriel7007@gmail.com',
        password: 'admin123' // Usar contraseña estándar para admin
      })
    });
    
    const loginText = await loginResponse.text();
    console.log(`Status: ${loginResponse.status}`);
    console.log('Response:', loginText);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEndpoint();
