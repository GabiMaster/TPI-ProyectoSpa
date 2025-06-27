// Use native fetch (Node 18+) or http module
const https = require('https');
const http = require('http');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBzcGEuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzUxMDI2MjE5LCJleHAiOjE3NTEwMjk4MTl9.LR-RdZo-qwejdRfpBUuKuNEV92KtX4xnQS1_SNaqsZA";

async function testHistorial() {
    try {
        console.log("Testing historial endpoint...");
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/turnos/historial-completo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({ ok: res.statusCode === 200, json: () => jsonData, status: res.statusCode });
                    } catch (e) {
                        resolve({ ok: false, status: res.statusCode, text: () => data });
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
        
        if (!response.ok) {
            console.log(`HTTP Error: ${response.status}`);
            return;
        }
        
        const data = response.json();
        console.log("Response received:");
        console.log(`Total turnos: ${data.length}`);
        
        if (data.length > 0) {
            console.log("Sample turno:");
            console.log(JSON.stringify(data[0], null, 2));
            
            // Check different states
            const states = {};
            data.forEach(turno => {
                states[turno.estado] = (states[turno.estado] || 0) + 1;
            });
            
            console.log("State distribution:");
            console.log(states);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testHistorial();
