const { pool } = require('../config/db');

async function migrate() {
  console.log('Running appointment status migration...');
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'appointments' AND column_name = 'rejection_reason'
        ) THEN
          ALTER TABLE appointments ADD COLUMN rejection_reason TEXT;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'appointments' AND column_name = 'confirmed_at'
        ) THEN
          ALTER TABLE appointments ADD COLUMN confirmed_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);
    console.log('Appointment status migration completed!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
