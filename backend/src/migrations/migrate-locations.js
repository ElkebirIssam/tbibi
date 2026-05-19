const { pool } = require('../config/db');

async function migrate() {
  // Create villes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS villes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nom VARCHAR(100) NOT NULL UNIQUE,
      pays VARCHAR(100) NOT NULL DEFAULT 'Tunisie',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create delegations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS delegations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ville_id UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
      nom VARCHAR(100) NOT NULL,
      code_postal VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(ville_id, nom)
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_delegations_ville ON delegations(ville_id)');
  console.log('  ✅ Villes and Delegations tables created');
  await pool.end();
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
