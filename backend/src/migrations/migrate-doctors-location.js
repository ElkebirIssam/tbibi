const { pool } = require('../config/db');

async function migrate() {
  // Check if columns already exist
  const check = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name IN ('ville_id', 'delegation_id')
  `);
  const existing = check.rows.map(r => r.column_name);

  if (!existing.includes('ville_id')) {
    await pool.query('ALTER TABLE doctors ADD COLUMN ville_id UUID REFERENCES villes(id) ON DELETE SET NULL');
    console.log('  ✅ Added ville_id to doctors');
  }
  if (!existing.includes('delegation_id')) {
    await pool.query('ALTER TABLE doctors ADD COLUMN delegation_id UUID REFERENCES delegations(id) ON DELETE SET NULL');
    console.log('  ✅ Added delegation_id to doctors');
  }
  if (!existing.includes('ville_id') || !existing.includes('delegation_id')) {
    console.log('  ✅ Doctors table updated with location references');
  } else {
    console.log('  ✅ Columns already exist');
  }
  await pool.end();
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
