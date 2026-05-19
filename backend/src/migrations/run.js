const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigrations() {
  console.log('Running database migrations...');
  try {
    const sqlPath = path.join(__dirname, '..', 'config', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

runMigrations();
