const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seedReset() {
  console.log('=== RESET & SEED DATABASE ===\n');

  // Step 1: Backup super_admin only
  console.log('1. Saving super_admin...');
  let savedAdmin = null;
  try {
    const exists = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    if (exists.rows[0].exists) {
      const admin = await pool.query("SELECT * FROM users WHERE role = 'super_admin' LIMIT 1");
      if (admin.rows[0]) savedAdmin = admin.rows[0];
    }
  } catch (_) {}
  console.log(`   ${savedAdmin ? 1 : 0} admin saved`);

  // Step 2: Drop all tables
  console.log('2. Dropping all tables...');
  const tables = [
    'prescriptions', 'lab_analyses', 'consultations', 'appointments',
    'fee_items', 'doctor_patients', 'documents', 'invoice_items', 'invoices',
    'assurances',
    'messages', 'payment_verifications', 'audit_logs', 'notifications',
    'doctor_availability', 'patients', 'doctors', 'delegations', 'villes',
    'specializations', 'users'
  ];
  for (const t of tables) await pool.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  await pool.query('DROP TYPE IF EXISTS user_role CASCADE');
  console.log('   All tables dropped');

  // Step 3: Recreate tables
  console.log('3. Recreating tables...');
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE TYPE user_role AS ENUM ('super_admin', 'doctor', 'assistant', 'nurse', 'patient');

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role user_role NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      address TEXT,
      is_active BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      verification_code VARCHAR(255),
      reset_token VARCHAR(255),
      reset_token_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE specializations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE assurances (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) UNIQUE NOT NULL,
      type VARCHAR(50) DEFAULT 'assurance',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE villes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      nom VARCHAR(100) NOT NULL UNIQUE,
      pays VARCHAR(100) NOT NULL DEFAULT 'Tunisie',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE delegations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ville_id UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
      nom VARCHAR(100) NOT NULL,
      code_postal VARCHAR(10),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(ville_id, nom)
    );

    CREATE TABLE doctors (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL,
      specialization VARCHAR(255),
      license_number VARCHAR(100),
      consultation_fee DECIMAL(10,2),
      bio TEXT,
      available_days TEXT[],
      cabinet_address TEXT,
      city VARCHAR(100),
      ville_id UUID REFERENCES villes(id) ON DELETE SET NULL,
      delegation_id UUID REFERENCES delegations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE patients (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_of_birth DATE,
      birth_place VARCHAR(255),
      city VARCHAR(100),
      gender VARCHAR(10),
      blood_group VARCHAR(5),
      allergies TEXT,
      chronic_diseases TEXT,
      emergency_contact_name VARCHAR(255),
      emergency_contact_phone VARCHAR(20),
      insurance_provider VARCHAR(255),
      insurance_number VARCHAR(100),
      patient_code VARCHAR(20) UNIQUE,
      national_id VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE doctor_patients (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(doctor_id, patient_id)
    );

    CREATE TABLE fee_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE appointments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(255),
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      rejection_reason TEXT, confirmed_at TIMESTAMPTZ, booked_for VARCHAR(255), notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE consultations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      fee_item_id UUID REFERENCES fee_items(id) ON DELETE SET NULL,
      fee_name VARCHAR(255),
      symptoms TEXT, report TEXT, diagnosis TEXT, prescribed_rest VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE prescriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      medication_name VARCHAR(255) NOT NULL, dosage VARCHAR(100),
      frequency VARCHAR(100), duration VARCHAR(100), notes TEXT
    );

    CREATE TABLE lab_analyses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      analysis_name VARCHAR(255) NOT NULL, instructions TEXT,
      status VARCHAR(20) DEFAULT 'pending', result_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL, title VARCHAR(255), content JSONB, pdf_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
      assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
      invoice_number VARCHAR(50),
      amount DECIMAL(10,2) NOT NULL, tax DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL, status VARCHAR(20) DEFAULT 'unpaid',
      paid_at TIMESTAMPTZ, pdf_url TEXT, promised_payment_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE invoice_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description VARCHAR(255) NOT NULL, quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL
    );

    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(255),
      content TEXT NOT NULL, is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE payment_verifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL, transaction_ref VARCHAR(255),
      proof_url VARCHAR(255), is_verified BOOLEAN DEFAULT false,
      verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL, entity_type VARCHAR(100), entity_id UUID,
      details JSONB, ip_address VARCHAR(45), created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT,
      data JSONB, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE doctor_availability (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
      slot_duration INTEGER DEFAULT 30, is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE consultation_access_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      requesting_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(6);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verification_expires TIMESTAMPTZ;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS promised_payment_date DATE;

    CREATE INDEX idx_notifications_user ON notifications(user_id);
    CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_role ON users(role);
    CREATE INDEX idx_doctors_specialization ON doctors(specialization_id);
    CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
    CREATE INDEX idx_appointments_patient ON appointments(patient_id);
    CREATE INDEX idx_appointments_date ON appointments(start_time);
    CREATE INDEX idx_messages_sender ON messages(sender_id);
    CREATE INDEX idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX idx_fee_items_doctor ON fee_items(doctor_id);
    CREATE INDEX idx_consultations_patient ON consultations(patient_id);
    CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
    CREATE INDEX idx_documents_patient ON documents(patient_id);
    CREATE INDEX idx_invoices_patient ON invoices(patient_id);
    CREATE INDEX idx_delegations_ville ON delegations(ville_id);
    CREATE INDEX idx_access_requests_consultation ON consultation_access_requests(consultation_id);
    CREATE INDEX idx_access_requests_requesting ON consultation_access_requests(requesting_doctor_id);
  `);
  console.log('   Tables recreated');

  // Step 4: Restore super admin
  console.log('4. Restoring super admin...');
  if (savedAdmin) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, address, is_active, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [savedAdmin.id, savedAdmin.email, savedAdmin.password_hash, savedAdmin.role,
       savedAdmin.first_name, savedAdmin.last_name, savedAdmin.phone, savedAdmin.address,
       savedAdmin.is_active, savedAdmin.is_verified, savedAdmin.created_at, savedAdmin.updated_at]
    );
    console.log('   Admin restored');
  } else {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['admin@tbibi.tn', hash, 'super_admin', 'Super', 'Admin', true, true]
    );
    console.log('   Admin created: admin@tbibi.tn / admin123');
  }

  // Step 5: Seed assurances
  console.log('5. Seeding assurances...');
  const assuranceList = [
    { name: 'CNAM', type: 'sécu' },
    { name: 'CNSS', type: 'sécu' },
    { name: 'Mutuelle Générale', type: 'mutuelle' },
    { name: 'Mutuelle des Fonctionnaires', type: 'mutuelle' },
    { name: 'GAT Assurance', type: 'assurance' },
    { name: 'ASTREE Assurance', type: 'assurance' },
    { name: 'COMAR Assurance', type: 'assurance' },
    { name: 'MAGHREBIA Assurance', type: 'assurance' },
    { name: 'STAR Assurance', type: 'assurance' },
    { name: 'CARTE Assurance', type: 'assurance' },
    { name: 'Takaful Assurance', type: 'assurance' },
    { name: 'ATB Assurance', type: 'assurance' },
    { name: 'Attijari Assurance', type: 'assurance' },
    { name: 'AXA Assurance Tunisie', type: 'assurance' },
    { name: 'BIAT Assurance', type: 'assurance' },
    { name: 'BT Assurance', type: 'assurance' },
    { name: 'CNI Assurance', type: 'assurance' },
    { name: 'El Amana Assurance', type: 'assurance' },
    { name: 'Hayett Assurance', type: 'assurance' },
    { name: 'L\'Intégrale Assurance', type: 'assurance' },
    { name: 'Lloyd Assurances', type: 'assurance' },
    { name: 'Ohio Assurance', type: 'assurance' },
    { name: 'Orient Assurance', type: 'assurance' },
    { name: 'Trust Assurances', type: 'assurance' },
    { name: 'Vitalis Assurance', type: 'assurance' },
    { name: 'Wiba Assurance', type: 'assurance' },
    { name: 'SOTUMA', type: 'assurance' },
  ];
  for (const a of assuranceList) {
    await pool.query('INSERT INTO assurances (name, type) VALUES ($1, $2) ON CONFLICT DO NOTHING', [a.name, a.type]);
  }
  console.log(`   ${assuranceList.length} assurances seeded`);

  // Step 7: Seed locations
  console.log('7. Seeding locations...');
  const locations = [
    { ville: 'Tunis', delegations: [{ nom: 'Tunis Ville', code: '1000' }, { nom: 'Bab Bhar', code: '1000' }, { nom: 'Bab Souika', code: '1002' }, { nom: 'Cite El Khadra', code: '1003' }, { nom: 'El Menzah', code: '1004' }, { nom: 'El Omrane', code: '1005' }, { nom: 'Le Bardo', code: '2000' }, { nom: 'Sidi Hassine', code: '1010' }] },
    { ville: 'Ariana', delegations: [{ nom: 'Ariana Ville', code: '2000' }, { nom: 'Ettadhamen', code: '2041' }, { nom: 'Soukra', code: '2036' }, { nom: 'Raoued', code: '2050' }] },
    { ville: 'Ben Arous', delegations: [{ nom: 'Ben Arous Ville', code: '2013' }, { nom: 'Hammam Lif', code: '2050' }, { nom: 'Megrine', code: '2033' }, { nom: 'Mohammedia', code: '2080' }] },
    { ville: 'Sousse', delegations: [{ nom: 'Sousse Ville', code: '4000' }, { nom: 'Hammam Sousse', code: '4011' }, { nom: 'Msaken', code: '4070' }, { nom: 'Kalâa Kebira', code: '4060' }] },
    { ville: 'Sfax', delegations: [{ nom: 'Sfax Ville', code: '3000' }, { nom: 'Sakiet Ezzit', code: '3021' }, { nom: 'Sakiet Eddaier', code: '3050' }, { nom: 'Gremda', code: '3060' }] },
    { ville: 'Nabeul', delegations: [{ nom: 'Nabeul Ville', code: '8000' }, { nom: 'Hammamet', code: '8050' }, { nom: 'Dar Chaabane', code: '8010' }, { nom: 'Menzel Temime', code: '8060' }] },
    { ville: 'Bizerte', delegations: [{ nom: 'Bizerte Ville', code: '7000' }, { nom: 'Menzel Bourguiba', code: '7140' }, { nom: 'Mateur', code: '7030' }, { nom: 'Ras Jebel', code: '7070' }] },
    { ville: 'Medenine', delegations: [{ nom: 'Medenine Ville', code: '4100' }, { nom: 'Djerba Houmet Souk', code: '4180' }, { nom: 'Ben Gardane', code: '4160' }] },
  ];
  for (const loc of locations) {
    const v = await pool.query('INSERT INTO villes (nom) VALUES ($1) RETURNING id', [loc.ville]);
    for (const d of loc.delegations) {
      await pool.query('INSERT INTO delegations (ville_id, nom, code_postal) VALUES ($1, $2, $3)', [v.rows[0].id, d.nom, d.code]);
    }
  }
  console.log(`   ${locations.length} villes seeded`);

  // Step 8: Seed specializations
  console.log('8. Seeding specializations...');
  const specs = [
    'Cardiologie', 'Pédiatrie', 'Dermatologie', 'Ophtalmologie',
    'Gynécologie', 'Orthopédie', 'Neurologie', 'ORL',
    'Psychiatrie', 'Médecine générale', 'Radiologie', 'Chirurgie générale',
  ];
  const specMap = {};
  for (const name of specs) {
    const r = await pool.query('INSERT INTO specializations (name) VALUES ($1) RETURNING id', [name]);
    specMap[name] = r.rows[0].id;
  }
  console.log(`   ${specs.length} specializations seeded`);

  // Step 9: Create 2 doctors
  console.log('9. Creating doctors...');
  const salt = await bcrypt.genSalt(10);
  const dHash = await bcrypt.hash('test123', salt);

  const docs = [
    { email: 'karim.ayari@tbibi.tn', firstName: 'Karim', lastName: 'Ayari', spec: 'Cardiologie', city: 'Tunis', addr: '45 Avenue Habib Bourguiba, Tunis', phone: '20123456' },
    { email: 'sami.benali@tbibi.tn', firstName: 'Sami', lastName: 'Ben Ali', spec: 'Pédiatrie', city: 'Sousse', addr: '12 Rue de Marseille, Sousse', phone: '20234567' },
  ];
  const doctorIds = [];
  for (const d of docs) {
    const user = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, is_active, is_verified)
       VALUES ($1, $2, 'doctor', $3, $4, $5, $6, true, true) RETURNING id`,
      [d.email, dHash, d.firstName, d.lastName, d.phone, d.addr]
    );
    const doc = await pool.query(
      `INSERT INTO doctors (user_id, specialization_id, specialization, city, cabinet_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [user.rows[0].id, specMap[d.spec], d.spec, d.city, d.addr]
    );
    doctorIds.push({ id: doc.rows[0].id, name: `${d.firstName} ${d.lastName}` });
    console.log(`   ✅ Dr. ${d.firstName} ${d.lastName} - ${d.spec}`);
  }

  // Step 10: Create 2 assistants per doctor (4 total)
  console.log('10. Creating assistants...');
  const aHash = await bcrypt.hash('assistant123', salt);
  const assistants = [
    { email: 'ali.benmohamed@tbibi.tn', firstName: 'Ali', lastName: 'Ben Mohamed', doctorIdx: 0 },
    { email: 'salma.jaziri@tbibi.tn', firstName: 'Salma', lastName: 'Jaziri', doctorIdx: 0 },
    { email: 'mohamed.feki@tbibi.tn', firstName: 'Mohamed', lastName: 'Feki', doctorIdx: 1 },
    { email: 'nour.belhaj@tbibi.tn', firstName: 'Nour', lastName: 'Belhaj', doctorIdx: 1 },
  ];
  for (const a of assistants) {
    await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, is_verified, doctor_id)
       VALUES ($1, $2, 'assistant', $3, $4, true, true, $5)`,
      [a.email, aHash, a.firstName, a.lastName, doctorIds[a.doctorIdx].id]
    );
    console.log(`   ✅ ${a.firstName} ${a.lastName} -> Dr. ${doctorIds[a.doctorIdx].name}`);
  }

  // Step 11: Create 2 patients per doctor (4 total)
  console.log('11. Creating patients...');
  const pHash = await bcrypt.hash('patient123', salt);
  const patients = [
    { email: 'ahmed.bensalem@test.tn', firstName: 'Ahmed', lastName: 'Ben Salem', phone: '50123456', gender: 'Homme', city: 'Tunis', dob: '1990-05-15', bg: 'A+', allergies: 'Pénicilline', diseases: 'Asthme' },
    { email: 'sarra.mzali@test.tn', firstName: 'Sarra', lastName: 'Mzali', phone: '50234567', gender: 'Femme', city: 'Tunis', dob: '1995-08-22', bg: 'O+', allergies: '', diseases: '' },
    { email: 'mohsen.gharbi@test.tn', firstName: 'Mohsen', lastName: 'Gharbi', phone: '50345678', gender: 'Homme', city: 'Sousse', dob: '1985-12-10', bg: 'B+', allergies: 'Sulfamides', diseases: 'Diabète type 2' },
    { email: 'amira.khelil@test.tn', firstName: 'Amira', lastName: 'Khelil', phone: '50456789', gender: 'Femme', city: 'Sousse', dob: '2000-03-28', bg: 'AB-', allergies: '', diseases: '' },
  ];
  const patientIds = [];
  for (const p of patients) {
    const user = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, is_verified)
       VALUES ($1, $2, 'patient', $3, $4, $5, true, true) RETURNING id`,
      [p.email, pHash, p.firstName, p.lastName, p.phone]
    );
    const idx = patients.indexOf(p);
    const patient = await pool.query(
      `INSERT INTO patients (user_id, date_of_birth, city, gender, blood_group, allergies, chronic_diseases, patient_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [user.rows[0].id, p.dob, p.city, p.gender, p.bg, p.allergies, p.diseases, `TB-${String(idx + 1).padStart(5, '0')}`]
    );
    patientIds.push({ id: patient.rows[0].id, doctorIdx: idx < 2 ? 0 : 1, name: `${p.firstName} ${p.lastName}` });
    console.log(`   ✅ ${p.firstName} ${p.lastName}`);
  }

  // Step 12: Assign patients to their doctor
  console.log('12. Assigning patients to doctors...');
  for (const p of patientIds) {
    await pool.query(
      'INSERT INTO doctor_patients (doctor_id, patient_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [doctorIds[p.doctorIdx].id, p.id]
    );
    console.log(`   ${p.name} -> Dr. ${doctorIds[p.doctorIdx].name}`);
  }

  // Step 13: Create doctor availability (Mon-Fri, 9h-17h)
  console.log('13. Creating doctor availability...');
  for (const d of doctorIds) {
    for (let day = 1; day <= 5; day++) {
      await pool.query(
        `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration)
         VALUES ($1, $2, $3, $4, $5)`,
        [d.id, day, '09:00', '17:00', 30]
      );
    }
  }
  console.log('   Done');

  // Step 14: Migration - ensure consultation_access_requests table exists
  console.log('14. Running migrations...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS consultation_access_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      requesting_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
      patient_status VARCHAR(20) DEFAULT 'pending' CHECK (patient_status IN ('pending','approved','denied')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_access_requests_consultation ON consultation_access_requests(consultation_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_access_requests_requesting ON consultation_access_requests(requesting_doctor_id)');
  console.log('   ✅ consultation_access_requests table ready');

  // Step 15: Add subject column to messages (migration for existing DBs)
  try {
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255)`);
    console.log('   ✅ messages.subject column added');
  } catch (_) { /* ignore if already exists */ }

  // Step 16: Add patient_status to consultation_access_requests
  try {
    await pool.query(`ALTER TABLE consultation_access_requests ADD COLUMN IF NOT EXISTS patient_status VARCHAR(20) DEFAULT 'pending' CHECK (patient_status IN ('pending','approved','denied'))`);
    console.log('   ✅ consultation_access_requests.patient_status column added');
  } catch (_) { /* ignore if already exists */ }

  console.log('\n=== SEED RESET COMPLETE ===');
  console.log('\nComptes :');
  console.log('  Admin      : admin@tbibi.tn / admin123');
  console.log('  Docteurs   : <email> / test123');
  console.log('  Assistants : <email> / assistant123');
  console.log('  Patients   : <email> / patient123');

  await pool.end();
}

seedReset().catch(e => { console.error('Error:', e.message); process.exit(1); });
