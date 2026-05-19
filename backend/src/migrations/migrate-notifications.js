const { pool } = require('../config/db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      data JSONB,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)');
  console.log('  ✅ Notifications table created');
  await pool.end();
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
