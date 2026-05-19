const db = require('../config/db');

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
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.is_verified
       FROM users u
       WHERE u.role IN ('assistant', 'nurse')
       ORDER BY u.last_name`
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
  async create({ userId, dateOfBirth, birthPlace, city, gender, bloodGroup, allergies, chronicDiseases, emergencyContactName, emergencyContactPhone, insuranceProvider, insuranceNumber }) {
    const { rows } = await db.query(
      `INSERT INTO patients (user_id, date_of_birth, birth_place, city, gender, blood_group, allergies, chronic_diseases, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [userId, dateOfBirth, birthPlace, city, gender, bloodGroup, allergies, chronicDiseases, emergencyContactName, emergencyContactPhone, insuranceProvider, insuranceNumber]
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
       WHERE u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1`,
      [searchTerm]
    );
    const total = parseInt(countResult.rows[0].count);
    const { rows } = await db.query(
      `SELECT p.id, u.id as user_id, u.email, u.first_name, u.last_name, u.phone
       FROM patients p JOIN users u ON p.user_id = u.id
       WHERE u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1
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
    return rows;
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
  async create({ doctorId, patientId, assistantId, title, startTime, endTime, notes }) {
    const { rows } = await db.query(
      `INSERT INTO appointments (doctor_id, patient_id, assistant_id, title, start_time, end_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [doctorId, patientId, assistantId, title, startTime, endTime, notes]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT a.*,
              pat_user.first_name as patient_first_name, pat_user.last_name as patient_last_name, pat_user.phone as patient_phone,
              doc_user.first_name as doctor_first_name, doc_user.last_name as doctor_last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pat_user ON p.user_id = pat_user.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users doc_user ON d.user_id = doc_user.id
       WHERE a.id = $1`,
      [id]
    );
    return rows[0];
  },

  async findByDoctor(doctorId, startDate, endDate) {
    let query = 'SELECT a.*, u.first_name as patient_first_name, u.last_name as patient_last_name, u.phone as patient_phone FROM appointments a JOIN patients p ON a.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE a.doctor_id = $1';
    const params = [doctorId];
    if (startDate && endDate) {
      query += ' AND a.start_time >= $2 AND a.end_time <= $3';
      params.push(startDate, endDate);
    }
    query += ' ORDER BY a.start_time';
    const { rows } = await db.query(query, params);
    return rows;
  },

  async findByPatient(patientId, startDate, endDate) {
    let query = 'SELECT a.*, doc_user.first_name as doctor_first_name, doc_user.last_name as doctor_last_name FROM appointments a JOIN doctors d ON a.doctor_id = d.id JOIN users doc_user ON d.user_id = doc_user.id WHERE a.patient_id = $1';
    const params = [patientId];
    if (startDate && endDate) {
      query += ' AND a.start_time >= $2 AND a.end_time <= $3';
      params.push(startDate, endDate);
    }
    query += ' ORDER BY a.start_time';
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
  async create({ appointmentId, patientId, doctorId, symptoms, report, diagnosis, prescribedRest }) {
    const { rows } = await db.query(
      `INSERT INTO consultations (appointment_id, patient_id, doctor_id, symptoms, report, diagnosis, prescribed_rest)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [appointmentId, patientId, doctorId, symptoms, report, diagnosis, prescribedRest]
    );
    return rows[0];
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
         ORDER BY i.created_at DESC`
      );
      rows = result.rows;
      limit = total;
    } else {
      const offset = (page - 1) * limit;
      const result = await db.query(
        `SELECT i.*, u.first_name, u.last_name FROM invoices i
         JOIN patients p ON i.patient_id = p.id
         JOIN users u ON p.user_id = u.id
         ORDER BY i.created_at DESC LIMIT $1 OFFSET $2`,
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
      'UPDATE invoices SET status = $1, paid_at = CASE WHEN $1 = \'paid\' THEN NOW() ELSE paid_at END WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  }
};

const Message = {
  async create({ senderId, receiverId, content }) {
    const { rows } = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiverId, content]
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
              m.content as last_message, m.created_at as last_message_at, m.is_read,
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
  }
};

module.exports = { User, Doctor, Patient, Appointment, Consultation, Document, Invoice, Message, PaymentVerification, AuditLog, Specialization, Notification };
