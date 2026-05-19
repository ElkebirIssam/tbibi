require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await c.connect();

  // Terminate existing connections
  await c.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [process.env.DB_NAME]);

  await c.query('DROP DATABASE IF EXISTS "' + process.env.DB_NAME + '"');
  console.log('DB dropped');
  await c.query('CREATE DATABASE "' + process.env.DB_NAME + '"');
  console.log('DB recreated');
  await c.end();
})().catch(e => { console.log('Error:', e.message); process.exit(1); });
