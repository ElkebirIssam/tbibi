const { pool } = require('./src/config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a token directly for testing
const payload = { id: '74b96631-1228-4cff-a9e7-1905f5ee7498', email: 'eliss@gmail.com', role: 'doctor' };
const token = jwt.sign(payload, process.env.JWT_SECRET || 'tbibi_jwt_secret_key_2024', { expiresIn: '1h' });
console.log('Token:', token);

// Now fetch invoices
const http = require('http');
http.get('http://localhost:5000/api/invoices?limit=50', { headers: { 'Authorization': 'Bearer ' + token } }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const d = JSON.parse(data);
    console.log('Total:', d.total);
    d.data?.forEach(i => {
      console.log(`  ${i.invoice_number} | patient=${i.patient_id} | total=${i.total} | date=${i.created_at} | status=${i.status}`);
    });
    process.exit();
  });
});