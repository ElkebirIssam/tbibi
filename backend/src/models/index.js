const db = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

const User = {
  async create({ email, passwordHash, role, firstName, lastName, phone, address, isActive }) {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [email, passwordHash, role, firstName, lastName, phone, address, isActive || false]
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },

  async findAll(role, { page = 1, limit = 20, search = '' } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) {
      conditions.push(`role = $${idx}`);
      params.push(role);
      idx++;
    }
    if (search) {
      conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await db.query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    let rows;
    if (limit === -1) {
      const result = await db.query(
        `SELECT id, email, role, first_name, last_name, phone, is_active, is_verified, created_at
         FROM users ${where} ORDER BY created_at DESC`, params
      );
      rows = result.rows;
      limit = total;
    } else {
      const offset = (page - 1) * limit;
      const result = await db.query(
        `SELECT id, email, role, first_name, last_name, phone, is_active, is_verified, created_at
         FROM users ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      );
      rows = result.rows;
    }
    return { data: rows, total, page, limit };
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async toggleActive(id) {
    const user = await this.findById(id);
    if (!user) return null;
    const { rows } = await db.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [!user.is_active, id]
    );
    return rows[0];
  }
};

const Doctor = {
  async create({ userId, specializationId, specialization, licenseNumber, consultationFee, bio, availableDays, cabinetAddress, city }) {
    const { rows } = await db.query(
      `INSERT INTO doctors (user_id, specialization_id, specialization, license_number, consultation_fee, bio, available_days, cabinet_address, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, specializationId, specialization, licenseNumber, consultationFee, bio, availableDays, cabinetAddress, city]
    );
    return rows[0];
  },

  async findByUserId(userId) {
    const { rows } = await db.query(
      `SELECT d.*, s.name as specialization_name
       FROM doctors d
       LEFT JOIN specializations s ON d.specialization_id = s.id
       WHERE d.user_id = $1`,
      [userId]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.phone, s.name as specialization_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN specializations s ON d.specialization_id = s.id
       WHERE d.id = $1`,
      [id]
    );
    return rows[0];
  },

  async update(id, fields) {
    // If specialization_id is set but specialization name is not, resolve it
    if (fields.specialization_id && !fields.specialization) {
      const spec = await db.query('SELECT name FROM specializations WHERE id = $1', [fields.specialization_id]);
      if (spec.rows[0]) {
        fields.specialization = spec.rows[0].name;
      }
    }
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE doctors SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  async findAll() {
    const { rows } = await db.query(
      `SELECT d.*, u.email, u.first_name, u.last_name, u.phone, s.name as specialization_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN specializations s ON d.specialization_id = s.id
       ORDER BY u.last_name`
    );
    return rows;
  },

  async getAssistants(doctorId) {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.is_active, u.is_verified
       FROM users u
       WHERE u.role IN ('assistant', 'nurse') AND u.doctor_id = $1
       ORDER BY u.last_name`,
      [doctorId]
    );
    return rows;
  },

  async getPatients(doctorId) {
    const { rows } = await db.query(
      `SELECT p.*, u.email, u.first_name, u.last_name, u.phone, u.address
       FROM doctor_patients dp
       JOIN patients p ON dp.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE dp.doctor_id = $1
       ORDER BY u.last_name`,
      [doctorId]
    );
    return rows;
  }
};

const Patient = {
  async generateCode() {
    const { rows } = await db.query("SELECT COALESCE(MAX(SUBSTRING(patient_code FROM 4)::INTEGER), 0) + 1 AS next FROM patients WHERE patient_code ~ '^TB-\\d+$'");
    const next = parseInt(rows[0].next);
    return `TB-${String(next).padStart(5, '0')}`;
  },

  async create({ userId, dateOfBirth, birthPlace, city, gender, bloodGroup, allergies, chronicDiseases, emergencyContactName, emergencyContactPhone, insuranceProvider, insuranceNumber, nationalId }) {
    const code = await this.generateCode();
    const { rows } = await db.query(
      `INSERT INTO patients (user_id, date_of_birth, birth_place, city, gender, blood_group, allergies, chronic_diseases, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number, patient_code, national_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [userId, dateOfBirth, birthPlace, city, gender, bloodGroup, allergies, chronicDiseases, emergencyContactName, emergencyContactPhone, insuranceProvider, insuranceNumber, code, nationalId]
    );
    return rows[0];
  },

  async findByUserId(userId) {
    const { rows } = await db.query(
      `SELECT p.*, u.email, u.first_name, u.last_name, u.phone, u.address
       FROM patients p JOIN users u ON p.user_id = u.id WHERE u.id = $1`,
      [userId]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT p.*, u.email, u.first_name, u.last_name, u.phone, u.address
       FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = $1`,
      [id]
    );
    return rows[0];
  },

  async search(query, { page = 1, limit = 20 } = {}) {
    const searchTerm = `%${query}%`;
    const offset = (page - 1) * limit;
    const countResult = await db.query(
      `SELECT COUNT(*) FROM patients p JOIN users u ON p.user_id = u.id
       WHERE p.patient_code ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR p.national_id ILIKE $1`,
      [searchTerm]
    );
    const total = parseInt(countResult.rows[0].count);
    const { rows } = await db.query(
      `SELECT p.id, p.patient_code, p.national_id, u.id as user_id, u.email, u.first_name, u.last_name, u.phone
       FROM patients p JOIN users u ON p.user_id = u.id
       WHERE p.patient_code ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR p.national_id ILIKE $1
       ORDER BY u.last_name LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset]
    );
    return { data: rows, total, page, limit };
  },

  async getConsultations(patientId) {
    const { rows } = await db.query(
      `SELECT c.*, d.id as doctor_id, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              COALESCE(s.name, d.specialization) as specialization
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN specializations s ON d.specialization_id = s.id
       WHERE c.patient_id = $1
       ORDER BY c.created_at DESC`,
      [patientId]
    );
    return rows.map(r => { r.symptoms = decrypt(r.symptoms); r.report = decrypt(r.report); r.diagnosis = decrypt(r.diagnosis); return r; });
  },

  async getDocuments(patientId) {
    const { rows } = await db.query(
      `SELECT doc.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM documents doc
       JOIN doctors d ON doc.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE doc.patient_id = $1
       ORDER BY doc.created_at DESC`,
      [patientId]
    );
    return rows;
  },

  async getInvoices(patientId) {
    const { rows } = await db.query(
      'SELECT * FROM invoices WHERE patient_id = $1 ORDER BY created_at DESC',
      [patientId]
    );
    for (const inv of rows) {
      const { rows: items } = await db.query(
        'SELECT * FROM invoice_items WHERE invoice_id = $1',
        [inv.id]
      );
      inv.items = items;
    }
    return rows;
  },

  async getLabAnalysesForPatient(patientId) {
    const { rows } = await db.query(
      `SELECT la.*, c.created_at as consultation_date, d.id as doctor_id,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM lab_analyses la
       JOIN consultations c ON la.consultation_id = c.id
       JOIN doctors d ON c.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE c.patient_id = $1
       ORDER BY la.created_at DESC`,
      [patientId]
    );
    return rows;
  },

  async assignToDoctor(patientId, doctorId) {
    const { rows } = await db.query(
      'INSERT INTO doctor_patients (doctor_id, patient_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [doctorId, patientId]
    );
    return rows[0];
  }
};

const Appointment = {
  async create({ doctorId, patientId, assistantId, title, startTime, endTime, notes, status, bookedFor }) {
    const { rows } = await db.query(
      `INSERT INTO appointments (doctor_id, patient_id, assistant_id, title, start_time, end_time, notes, status, booked_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [doctorId, patientId, assistantId, title, startTime, endTime, notes, status || 'pending', bookedFor || null]
    );
    return rows[0];
  },

  async findByPatientAndDate(patientId, date) {
    const { rows } = await db.query(
      `SELECT id, status FROM appointments
       WHERE patient_id = $1
         AND DATE(start_time) = $2
         AND status IN ('pending', 'confirmed')`,
      [patientId, date]
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT a.*, p.patient_code,
              pat_user.first_name as patient_first_name, pat_user.last_name as patient_last_name, pat_user.phone as patient_phone,
              doc_user.first_name as doctor_first_name, doc_user.last_name as doctor_last_name,
              CASE WHEN c.id IS NOT NULL THEN true
                   WHEN EXISTS (SELECT 1 FROM consultations c2 WHERE c2.patient_id = a.patient_id AND c2.doctor_id = a.doctor_id AND c2.created_at::date = a.start_time::date) THEN true
                   ELSE false END as has_consultation
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pat_user ON p.user_id = pat_user.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users doc_user ON d.user_id = doc_user.id
       LEFT JOIN consultations c ON c.appointment_id = a.id
       WHERE a.id = $1`,
      [id]
    );
    return rows[0];
  },

  async findByDoctor(doctorId, startDate, endDate) {
    let query = `SELECT a.*, p.patient_code, u.first_name as patient_first_name, u.last_name as patient_last_name, u.phone as patient_phone,
                        CASE WHEN c.id IS NOT NULL THEN true
                             WHEN EXISTS (SELECT 1 FROM consultations c2 WHERE c2.patient_id = a.patient_id AND c2.doctor_id = a.doctor_id AND c2.created_at::date = a.start_time::date) THEN true
                             ELSE false END as has_consultation
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 JOIN users u ON p.user_id = u.id
                 LEFT JOIN consultations c ON c.appointment_id = a.id
                 WHERE a.doctor_id = $1`;
    const params = [doctorId];
    if (startDate && endDate) {
      // Include all appointments starting within the date range
      query += ' AND a.start_time >= $2::date AND a.start_time < $3::date + interval \'1 day\'';
      params.push(startDate, endDate);
    }
    query += ' ORDER BY a.start_time';
    const { rows } = await db.query(query, params);
    return rows;
  },

  async findByPatient(patientId, startDate, endDate) {
    let query = `SELECT a.*, p.patient_code, doc_user.first_name as doctor_first_name, doc_user.last_name as doctor_last_name,
                        COALESCE(s.name, d.specialization) as specialization,
                        CASE WHEN c.id IS NOT NULL THEN true
                             WHEN EXISTS (SELECT 1 FROM consultations c2 WHERE c2.patient_id = a.patient_id AND c2.doctor_id = a.doctor_id AND c2.created_at::date = a.start_time::date) THEN true
                             ELSE false END as has_consultation
                 FROM appointments a
                 JOIN doctors d ON a.doctor_id = d.id
                 JOIN users doc_user ON d.user_id = doc_user.id
                 JOIN patients p ON a.patient_id = p.id
                 LEFT JOIN specializations s ON d.specialization_id = s.id
                 LEFT JOIN consultations c ON c.appointment_id = a.id
                 WHERE a.patient_id = $1`;
    const params = [patientId];
    if (startDate && endDate) {
      query += ' AND a.start_time >= $2::date AND a.start_time < $3::date + interval \'1 day\'';
      params.push(startDate, endDate);
    }
    query += ' ORDER BY a.start_time DESC';
    const { rows } = await db.query(query, params);
    return rows;
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE appointments SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM appointments WHERE id = $1', [id]);
  }
};

const Consultation = {
  async create({ appointmentId, patientId, doctorId, feeItemId, feeName, symptoms, report, diagnosis, prescribedRest }) {
    const { rows } = await db.query(
      `INSERT INTO consultations (appointment_id, patient_id, doctor_id, fee_item_id, fee_name, symptoms, report, diagnosis, prescribed_rest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [appointmentId, patientId, doctorId, feeItemId, feeName, encrypt(symptoms), encrypt(report), encrypt(diagnosis), prescribedRest]
    );
    const r = rows[0];
    if (r) { r.symptoms = decrypt(r.symptoms); r.report = decrypt(r.report); r.diagnosis = decrypt(r.diagnosis); }
    return r;
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT c.*, u.first_name, u.last_name FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    const r = rows[0];
    if (r) { r.symptoms = decrypt(r.symptoms); r.report = decrypt(r.report); r.diagnosis = decrypt(r.diagnosis); }
    return r;
  },

  async addPrescription(consultationId, { medicationName, dosage, frequency, duration, notes }) {
    const { rows } = await db.query(
      `INSERT INTO prescriptions (consultation_id, medication_name, dosage, frequency, duration, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [consultationId, encrypt(medicationName), dosage, frequency, duration, encrypt(notes)]
    );
    const r = rows[0];
    if (r) { r.medication_name = decrypt(r.medication_name); r.notes = decrypt(r.notes); }
    return r;
  },

  async getPrescriptions(consultationId) {
    const { rows } = await db.query('SELECT * FROM prescriptions WHERE consultation_id = $1', [consultationId]);
    return rows.map(r => { r.medication_name = decrypt(r.medication_name); r.notes = decrypt(r.notes); return r; });
  },

  async findByDoctor(doctorId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const countResult = await db.query(
      `SELECT COUNT(*) FROM consultations WHERE doctor_id = $1`, [doctorId]
    );
    const total = parseInt(countResult.rows[0].count);
    const { rows } = await db.query(
      `SELECT c.*, u.first_name, u.last_name, u.email, p.patient_code, f.name as fee_item_name
       FROM consultations c
       JOIN patients p ON c.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN fee_items f ON c.fee_item_id = f.id
       WHERE c.doctor_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );
    return {
      data: rows.map(r => { r.symptoms = decrypt(r.symptoms); r.report = decrypt(r.report); r.diagnosis = decrypt(r.diagnosis); return r; }),
      total, page, limit
    };
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT c.*, u.first_name, u.last_name FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    return rows[0];
  },

  async addPrescription(consultationId, { medicationName, dosage, frequency, duration, notes }) {
    const { rows } = await db.query(
      `INSERT INTO prescriptions (consultation_id, medication_name, dosage, frequency, duration, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [consultationId, medicationName, dosage, frequency, duration, notes]
    );
    return rows[0];
  },

  async addLabAnalysis(consultationId, { analysisName, instructions }) {
    const { rows } = await db.query(
      `INSERT INTO lab_analyses (consultation_id, analysis_name, instructions)
       VALUES ($1, $2, $3) RETURNING *`,
      [consultationId, analysisName, instructions]
    );
    return rows[0];
  },

  async getPrescriptions(consultationId) {
    const { rows } = await db.query('SELECT * FROM prescriptions WHERE consultation_id = $1', [consultationId]);
    return rows;
  },

  async getLabAnalyses(consultationId) {
    const { rows } = await db.query('SELECT * FROM lab_analyses WHERE consultation_id = $1', [consultationId]);
    return rows;
  },

  async findByDoctor(doctorId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const countResult = await db.query(
      `SELECT COUNT(*) FROM consultations WHERE doctor_id = $1`, [doctorId]
    );
    const total = parseInt(countResult.rows[0].count);
    const { rows } = await db.query(
      `SELECT c.*, u.first_name, u.last_name, u.email, p.patient_code, f.name as fee_item_name
       FROM consultations c
       JOIN patients p ON c.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN fee_items f ON c.fee_item_id = f.id
       WHERE c.doctor_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );
    return { data: rows, total, page, limit };
  },

  async requestAccess(consultationId, requestingDoctorId) {
    const { rows } = await db.query(
      `INSERT INTO consultation_access_requests (consultation_id, requesting_doctor_id)
       VALUES ($1, $2) RETURNING *`,
      [consultationId, requestingDoctorId]
    );
    return rows[0];
  },

  async getAccessRequests(doctorId) {
    const { rows } = await db.query(
      `SELECT r.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              c.patient_id, c.created_at as consultation_date
       FROM consultation_access_requests r
       JOIN consultations c ON r.consultation_id = c.id
       JOIN doctors d ON r.requesting_doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE c.doctor_id = $1
       ORDER BY r.created_at DESC`,
      [doctorId]
    );
    return rows;
  },

  async getAccessStatus(consultationId, requestingDoctorId) {
    const { rows } = await db.query(
      `SELECT status, patient_status FROM consultation_access_requests
       WHERE consultation_id = $1 AND requesting_doctor_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [consultationId, requestingDoctorId]
    );
    return rows[0] || { status: null, patient_status: null };
  },

  async respondToAccessRequest(requestId, status) {
    const { rows } = await db.query(
      `UPDATE consultation_access_requests SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, requestId]
    );
    return rows[0];
  },

  async updateAccessStatus(requestId, doctorStatus, patientStatus) {
    const { rows } = await db.query(
      `UPDATE consultation_access_requests SET status = $1, patient_status = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [doctorStatus, patientStatus, requestId]
    );
    return rows[0];
  },

  async patientRespondToAccessRequest(requestId, patientStatus) {
    const { rows } = await db.query(
      `UPDATE consultation_access_requests SET patient_status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [patientStatus, requestId]
    );
    return rows[0];
  },

  async checkAccess(consultationId, doctorId) {
    const { rows } = await db.query(
      `SELECT 1 FROM consultations WHERE id = $1 AND doctor_id = $2
       UNION
       SELECT 1 FROM consultation_access_requests
       WHERE consultation_id = $1 AND requesting_doctor_id = $2 AND status = 'approved' AND patient_status = 'approved'`,
      [consultationId, doctorId]
    );
    return rows.length > 0;
  },

  async findAccessRequestByConsultation(consultationId, requestingDoctorId) {
    const { rows } = await db.query(
      `SELECT * FROM consultation_access_requests
       WHERE consultation_id = $1 AND requesting_doctor_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [consultationId, requestingDoctorId]
    );
    return rows[0] || null;
  }
};

const Document = {
  async create({ doctorId, patientId, type, title, content }) {
    const { rows } = await db.query(
      `INSERT INTO documents (doctor_id, patient_id, type, title, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [doctorId, patientId, type, title, JSON.stringify(content)]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [id]);
    return rows[0];
  },

  async updatePdfUrl(id, pdfUrl) {
    const { rows } = await db.query('UPDATE documents SET pdf_url = $1 WHERE id = $2 RETURNING *', [pdfUrl, id]);
    return rows[0];
  }
};

const Invoice = {
  async create({ patientId, doctorId, assistantId, invoiceNumber, amount, tax, total, items }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO invoices (patient_id, doctor_id, assistant_id, invoice_number, amount, tax, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [patientId, doctorId, assistantId, invoiceNumber, amount, tax, total]
      );
      const invoice = rows[0];
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5)`,
          [invoice.id, item.description, item.quantity, item.unitPrice, item.total]
        );
      }
      await client.query('COMMIT');
      return invoice;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findAll({ page = 1, limit = 20 } = {}) {
    const countResult = await db.query('SELECT COUNT(*) FROM invoices');
    const total = parseInt(countResult.rows[0].count);
    let rows;
    if (limit === -1) {
      const result = await db.query(
        `SELECT i.*, u.first_name, u.last_name FROM invoices i
         JOIN patients p ON i.patient_id = p.id
         JOIN users u ON p.user_id = u.id
         ORDER BY CASE WHEN i.status = 'unpaid' THEN 0 ELSE 1 END, i.created_at DESC`
      );
      rows = result.rows;
      limit = total;
    } else {
      const offset = (page - 1) * limit;
      const result = await db.query(
        `SELECT i.*, u.first_name, u.last_name FROM invoices i
         JOIN patients p ON i.patient_id = p.id
         JOIN users u ON p.user_id = u.id
         ORDER BY CASE WHEN i.status = 'unpaid' THEN 0 ELSE 1 END, i.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      rows = result.rows;
    }
    return { data: rows, total, page, limit };
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT i.*, u.first_name, u.last_name FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE i.id = $1`,
      [id]
    );
    return rows[0];
  },

  async getItems(invoiceId) {
    const { rows } = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
    return rows;
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE invoices SET status = $1::VARCHAR, paid_at = CASE WHEN $1::VARCHAR = \'paid\' THEN NOW() ELSE paid_at END WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  },

  async split(id, { amount, description, promisedPaymentDate }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: origRows } = await client.query('SELECT * FROM invoices WHERE id = $1', [id]);
      if (!origRows.length) throw new Error('Invoice not found.');
      const orig = origRows[0];
      const newTotal = parseFloat(orig.total) - amount;
      if (newTotal < 0) throw new Error('Split amount exceeds invoice total.');

      const newInvoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;

      const { rows: newRows } = await client.query(
        `INSERT INTO invoices (patient_id, doctor_id, assistant_id, invoice_number, amount, tax, total, promised_payment_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [orig.patient_id, orig.doctor_id, orig.assistant_id, newInvoiceNumber, amount, 0, amount, promisedPaymentDate || null]
      );
      const newInvoice = newRows[0];

      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
         VALUES ($1, $2, 1, $3, $3)`,
        [newInvoice.id, description || 'Division note d\'honoraires', amount]
      );

      await client.query(
        'UPDATE invoices SET amount = $1, total = $2 WHERE id = $3',
        [newTotal, newTotal, id]
      );

      await client.query('COMMIT');
      return { original: { ...orig, amount: String(newTotal), total: String(newTotal) }, newInvoice };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

const Message = {
  async create({ senderId, receiverId, subject, content }) {
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, subject, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [senderId, receiverId, subject || null, content]
    );
    return rows[0];
  },

  async getConversation(user1Id, user2Id, limit = 50) {
    const { rows } = await db.query(
      `SELECT m.*, u_s.first_name as sender_first_name, u_s.last_name as sender_last_name,
              u_r.first_name as receiver_first_name, u_r.last_name as receiver_last_name
       FROM messages m
       JOIN users u_s ON m.sender_id = u_s.id
       JOIN users u_r ON m.receiver_id = u_r.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC LIMIT $3`,
      [user1Id, user2Id, limit]
    );
    return rows.reverse();
  },

  async getUnreadCount(userId) {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(rows[0].count);
  },

  async markAsRead(messageId) {
    const { rows } = await db.query(
      'UPDATE messages SET is_read = true WHERE id = $1 RETURNING *',
      [messageId]
    );
    return rows[0];
  },

  async getConversations(userId) {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (other_user.id)
              other_user.id as user_id, other_user.first_name, other_user.last_name, other_user.role,
              m.subject as last_subject, m.content as last_message, m.created_at as last_message_at, m.is_read,
              CASE WHEN m.sender_id = $1 THEN 'sent' ELSE 'received' END as message_type
       FROM messages m
       JOIN users other_user ON other_user.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY other_user.id, m.created_at DESC`,
      [userId]
    );
    return rows;
  }
};

const PaymentVerification = {
  async create({ userId, amount, transactionRef, proofUrl }) {
    const { rows } = await db.query(
      `INSERT INTO payment_verifications (user_id, amount, transaction_ref, proof_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, amount, transactionRef, proofUrl]
    );
    return rows[0];
  },

  async findByUserId(userId) {
    const { rows } = await db.query(
      'SELECT * FROM payment_verifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows[0];
  },

  async findAll({ page = 1, limit = 20 } = {}) {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM payment_verifications pv JOIN users u ON pv.user_id = u.id`
    );
    const total = parseInt(countResult.rows[0].count);
    let rows;
    if (limit === -1) {
      const result = await db.query(
        `SELECT pv.*, u.email, u.first_name, u.last_name, u.role
         FROM payment_verifications pv
         JOIN users u ON pv.user_id = u.id
         ORDER BY pv.created_at DESC`
      );
      rows = result.rows;
      limit = total;
    } else {
      const offset = (page - 1) * limit;
      const result = await db.query(
        `SELECT pv.*, u.email, u.first_name, u.last_name, u.role
         FROM payment_verifications pv
         JOIN users u ON pv.user_id = u.id
         ORDER BY pv.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      rows = result.rows;
    }
    return { data: rows, total, page, limit };
  },

  async verify(id, verifiedBy) {
    const { rows } = await db.query(
      'UPDATE payment_verifications SET is_verified = true, verified_by = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [verifiedBy, id]
    );
    return rows[0];
  }
};

const AuditLog = {
  async create({ userId, action, entityType, entityId, details, ipAddress }) {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId, JSON.stringify(details), ipAddress]
    );
  },

  async findAll(limit = 50) {
    const { rows } = await db.query(
      `SELECT al.*, u.email, u.first_name, u.last_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  }
};

const Specialization = {
  async create({ name, description }) {
    const { rows } = await db.query(
      `INSERT INTO specializations (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description]
    );
    return rows[0];
  },

  async findAll(activeOnly = false, { page = 1, limit = 20, search = '' } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (activeOnly) {
      conditions.push('is_active = true');
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await db.query(`SELECT COUNT(*) FROM specializations${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    let rows;
    if (limit === -1) {
      const result = await db.query(`SELECT * FROM specializations${where} ORDER BY name`, params);
      rows = result.rows;
      limit = total;
    } else {
      const offset = (page - 1) * limit;
      const result = await db.query(
        `SELECT * FROM specializations${where} ORDER BY name LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      );
      rows = result.rows;
    }
    return { data: rows, total, page, limit };
  },

  async findAllSimple(activeOnly = false) {
    let sql = 'SELECT * FROM specializations';
    if (activeOnly) sql += ' WHERE is_active = true';
    sql += ' ORDER BY name';
    const { rows } = await db.query(sql);
    return rows;
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM specializations WHERE id = $1', [id]);
    return rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE specializations SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  async toggleActive(id) {
    const spec = await this.findById(id);
    if (!spec) return null;
    const { rows } = await db.query(
      'UPDATE specializations SET is_active = $1 WHERE id = $2 RETURNING *',
      [!spec.is_active, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM specializations WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

const Notification = {
  async create({ userId, type, title, message, data }) {
    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );
    return rows[0];
  },

  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const countResult = await db.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count);

    let rows;
    if (limit === -1) {
      const result = await db.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      );
      rows = result.rows;
    }
    return { data: rows, total, page, limit };
  },

  async getUnreadCount(userId) {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(rows[0].count);
  },

  async markAsRead(id) {
    const { rows } = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  },

  async markAllAsRead(userId) {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  },

  async delete(id) {
    const { rows } = await db.query(
      'DELETE FROM notifications WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0];
  }
};

const DoctorAvailability = {
  async upsert(doctorId, slots) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM doctor_availability WHERE doctor_id = $1', [doctorId]);
      for (const slot of slots) {
        await client.query(
          `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration)
           VALUES ($1, $2, $3, $4, $5)`,
          [doctorId, slot.dayOfWeek, slot.startTime, slot.endTime, slot.slotDuration || 30]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findByDoctor(doctorId) {
    const { rows } = await db.query(
      'SELECT * FROM doctor_availability WHERE doctor_id = $1 AND is_active = true ORDER BY day_of_week, start_time',
      [doctorId]
    );
    return rows;
  },

  async getAvailableSlots(doctorId, date) {
    const dayOfWeek = new Date(date).getDay();
    const availabilities = await db.query(
      `SELECT * FROM doctor_availability
       WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true`,
      [doctorId, dayOfWeek]
    );
    if (availabilities.rows.length === 0) return [];

    const existingAppointments = await db.query(
      `SELECT start_time, end_time, status FROM appointments
       WHERE doctor_id = $1
         AND DATE(start_time) = $2
         AND status != 'cancelled'`,
      [doctorId, date]
    );

    const slots = [];
    for (const avail of availabilities.rows) {
      const startMinutes = timeToMinutes(avail.start_time);
      const endMinutes = timeToMinutes(avail.end_time);
      const duration = avail.slot_duration || 30;

      for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
        const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((m + duration) / 60)).padStart(2, '0')}:${String((m + duration) % 60).padStart(2, '0')}`;
        const matching = existingAppointments.rows.find(a => {
          const aStart = `${String(a.start_time.getHours()).padStart(2, '0')}:${String(a.start_time.getMinutes()).padStart(2, '0')}`;
          const aEnd = `${String(a.end_time.getHours()).padStart(2, '0')}:${String(a.end_time.getMinutes()).padStart(2, '0')}`;
          return slotStart < aEnd && slotEnd > aStart;
        });
        slots.push({
          start: slotStart,
          end: slotEnd,
          status: matching ? matching.status : 'available'
        });
      }
    }
    return slots;
  }
};

const Assurance = {
  async findAll() {
    const { rows } = await db.query('SELECT * FROM assurances WHERE is_active = true ORDER BY type, name');
    return rows;
  },
};

const FeeItem = {
  async create({ doctorId, name, description, price, category }) {
    const { rows } = await db.query(
      `INSERT INTO fee_items (doctor_id, name, description, price, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [doctorId, name, description, price, category]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM fee_items WHERE id = $1', [id]);
    return rows[0];
  },

  async findByDoctor(doctorId) {
    const { rows } = await db.query(
      'SELECT * FROM fee_items WHERE doctor_id = $1 ORDER BY name',
      [doctorId]
    );
    return rows;
  },

  async update(id, fields) {
    fields.updated_at = new Date().toISOString();
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE fee_items SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM fee_items WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

function timeToMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

module.exports = { User, Doctor, Patient, Appointment, Consultation, Document, Invoice, Message, PaymentVerification, AuditLog, Specialization, Notification, DoctorAvailability, FeeItem, Assurance };
