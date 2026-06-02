const { pool } = require('../config/db');

async function migrate() {
  console.log('Running availability migration...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctor_availability (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        slot_duration INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(doctor_id, day_of_week, start_time)
      );
      CREATE INDEX IF NOT EXISTS idx_availability_doctor ON doctor_availability(doctor_id);
    `);
    console.log('Availability migration completed!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
