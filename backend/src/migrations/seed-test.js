const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seedTest() {
  console.log('Seeding test data...');

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('test123', salt);

  // Create specializations first
  const specNames = [
    'Cardiologie', 'Pédiatrie', 'Dermatologie', 'Ophtalmologie',
    'Gynécologie', 'Orthopédie', 'Neurologie', 'ORL',
    'Psychiatrie', 'Médecine générale', 'Radiologie', 'Chirurgie'
  ];

  const specMap = {};
  for (const name of specNames) {
    const existing = await pool.query('SELECT id FROM specializations WHERE name = $1', [name]);
    if (existing.rows[0]) {
      specMap[name] = existing.rows[0].id;
    } else {
      const result = await pool.query(
        'INSERT INTO specializations (name) VALUES ($1) RETURNING id',
        [name]
      );
      specMap[name] = result.rows[0].id;
    }
  }

  const doctors = [
    { email: 'karim.ayari@tbibi.tn', firstName: 'Karim', lastName: 'Ayari', specName: 'Cardiologie', city: 'Tunis', cabinetAddress: '45 Avenue Habib Bourguiba, Tunis', phone: '20123456' },
    { email: 'sami.benali@tbibi.tn', firstName: 'Sami', lastName: 'Ben Ali', specName: 'Pédiatrie', city: 'Tunis', cabinetAddress: '12 Rue de Marseille, Tunis', phone: '20234567' },
    { email: 'ines.gharbi@tbibi.tn', firstName: 'Ines', lastName: 'Gharbi', specName: 'Dermatologie', city: 'Sousse', cabinetAddress: '8 Avenue Farhat Hached, Sousse', phone: '20345678' },
    { email: 'mohamed.trabelsi@tbibi.tn', firstName: 'Mohamed', lastName: 'Trabelsi', specName: 'Ophtalmologie', city: 'Sfax', cabinetAddress: '3 Rue Habib Thameur, Sfax', phone: '20456789' },
    { email: 'nadia.khemiri@tbibi.tn', firstName: 'Nadia', lastName: 'Khemiri', specName: 'Gynécologie', city: 'Tunis', cabinetAddress: '20 Rue Ali Belhouane, Tunis', phone: '20567890' },
    { email: 'ahmed.bouazizi@tbibi.tn', firstName: 'Ahmed', lastName: 'Bouazizi', specName: 'Orthopédie', city: 'Nabeul', cabinetAddress: '5 Avenue de la République, Nabeul', phone: '20678901' },
    { email: 'leila.mansour@tbibi.tn', firstName: 'Leila', lastName: 'Mansour', specName: 'Neurologie', city: 'Tunis', cabinetAddress: '15 Rue d\'Alger, Tunis', phone: '20789012' },
    { email: 'houssem.dridi@tbibi.tn', firstName: 'Houssem', lastName: 'Dridi', specName: 'ORL', city: 'Sousse', cabinetAddress: '10 Boulevard de l\'Environnement, Sousse', phone: '20890123' },
    { email: 'fatma.zaier@tbibi.tn', firstName: 'Fatma', lastName: 'Zaier', specName: 'Psychiatrie', city: 'Tunis', cabinetAddress: '7 Rue de Palestine, Tunis', phone: '20901234' },
    { email: 'youssef.salem@tbibi.tn', firstName: 'Youssef', lastName: 'Salem', specName: 'Médecine générale', city: 'Bizerte', cabinetAddress: '2 Avenue Habib Bourguiba, Bizerte', phone: '21012345' },
  ];

  for (const d of doctors) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [d.email]);
    if (existing.rows.length > 0) {
      console.log(`  ⏩ ${d.email} existe déjà`);
      continue;
    }

    const user = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, is_active, is_verified)
       VALUES ($1, $2, 'doctor', $3, $4, $5, $6, true, true) RETURNING id`,
      [d.email, hash, d.firstName, d.lastName, d.phone, d.cabinetAddress]
    );

    await pool.query(
      `INSERT INTO doctors (user_id, specialization_id, specialization, city, cabinet_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.rows[0].id, specMap[d.specName], d.specName, d.city, d.cabinetAddress]
    );

    console.log(`  ✅ ${d.firstName} ${d.lastName} - ${d.specName} (${d.city})`);
  }

  console.log('Seed test terminé !');
  await pool.end();
}

seedTest().catch(e => { console.error(e.message); process.exit(1); });
