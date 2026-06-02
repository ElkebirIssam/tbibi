const { pool } = require('../config/db');

async function migrate() {
  console.log('Running patient_code migration...');
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'patients' AND column_name = 'patient_code'
        ) THEN
          ALTER TABLE patients ADD COLUMN patient_code VARCHAR(20) UNIQUE;
          CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
        END IF;
      END $$;
    `);
    console.log('Patient code migration completed!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
