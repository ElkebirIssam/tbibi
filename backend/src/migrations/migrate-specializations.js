const { pool } = require('../config/db');

async function migrate() {
  console.log('Migrating specializations...');

  // Create specializations table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS specializations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add specialization_id column if not exists
  const colCheck = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'specialization_id'
  `);
  if (colCheck.rows.length === 0) {
    await pool.query(`
      ALTER TABLE doctors ADD COLUMN specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL
    `);
    console.log('  ✅ Added specialization_id to doctors table');
  }

  // Get distinct specializations from existing doctors
  const { rows } = await pool.query(
    `SELECT DISTINCT TRIM(specialization) as name FROM doctors WHERE specialization IS NOT NULL AND specialization != ''`
  );

  const specMap = {};
  for (const r of rows) {
    const existing = await pool.query('SELECT id FROM specializations WHERE name = $1', [r.name]);
    if (existing.rows[0]) {
      specMap[r.name] = existing.rows[0].id;
    } else {
      const result = await pool.query(
        'INSERT INTO specializations (name) VALUES ($1) RETURNING id',
        [r.name]
      );
      specMap[r.name] = result.rows[0].id;
      console.log(`  ✅ Created specialization: ${r.name}`);
    }
  }

  // Update doctors with specialization_id
  for (const [name, id] of Object.entries(specMap)) {
    await pool.query(
      'UPDATE doctors SET specialization_id = $1 WHERE specialization = $2 AND specialization_id IS NULL',
      [id, name]
    );
  }

  console.log('Migration terminée !');
  await pool.end();
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
