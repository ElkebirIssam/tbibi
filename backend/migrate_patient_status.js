require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
});
(async () => {
  await pool.query(`ALTER TABLE consultation_access_requests ADD COLUMN IF NOT EXISTS patient_status VARCHAR(20) DEFAULT 'pending' CHECK (patient_status IN ('pending','approved','denied'))`);
  console.log('✅ patient_status column added');
  await pool.end();
})();
