const { pool } = require('../config/db');

async function migrate() {
  console.log('Running booked_for migration...');
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'appointments' AND column_name = 'booked_for'
        ) THEN
          ALTER TABLE appointments ADD COLUMN booked_for VARCHAR(255);
        END IF;
      END $$;
    `);
    console.log('Booked for migration completed!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
