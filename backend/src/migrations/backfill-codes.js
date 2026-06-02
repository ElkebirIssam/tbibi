const { pool } = require('../config/db');

async function main() {
  const { rows } = await pool.query(
    "SELECT id FROM patients WHERE patient_code IS NULL ORDER BY created_at"
  );
  for (let i = 0; i < rows.length; i++) {
    const code = 'TB-' + String(i + 1).padStart(5, '0');
    await pool.query('UPDATE patients SET patient_code = $1 WHERE id = $2', [code, rows[i].id]);
  }
  console.log('Updated ' + rows.length + ' patients with codes');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
