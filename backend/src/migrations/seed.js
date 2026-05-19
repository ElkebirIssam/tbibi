const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  console.log('Seeding database...');
  try {
    const existingAdmin = await pool.query(
      "SELECT * FROM users WHERE role = 'super_admin' LIMIT 1"
    );

    if (existingAdmin.rows.length > 0) {
      console.log('Super admin already exists, skipping seed.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      await pool.query(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['admin@tbibi.tn', passwordHash, 'super_admin', 'Super', 'Admin', true, true]
      );
      console.log('Super admin created:');
      console.log('  Email: admin@tbibi.tn');
      console.log('  Password: admin123');
    }

    console.log('Seed completed!');
  } catch (error) {
    console.error('Seed error:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
