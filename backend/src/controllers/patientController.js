const { Patient, Doctor, AuditLog } = require('../models');
const db = require('../config/db');

const patientController = {
  async create(req, res) {
    try {
      const {
        email, firstName, lastName, phone, address, password,
        dateOfBirth, gender, bloodGroup, allergies,
        emergencyContactName, emergencyContactPhone,
        insuranceProvider, insuranceNumber
      } = req.body;

      const bcrypt = require('bcryptjs');
      const { User } = require('../models');
      const { generateVerificationCode } = require('../utils/helpers');

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        email,
        passwordHash,
        role: 'patient',
        firstName,
        lastName,
        phone,
        address,
      });

      const patient = await Patient.create({
        userId: user.id,
        dateOfBirth,
        gender,
        bloodGroup,
        allergies,
        emergencyContactName,
        emergencyContactPhone,
        insuranceProvider,
        insuranceNumber,
      });

      // If assistant created patient, assign to assistant's doctor
      if (req.user.role === 'assistant' || req.user.role === 'nurse') {
        const assistantDoctor = await db.query(
          `SELECT d.id FROM doctors d
           JOIN users u ON d.user_id = u.id
           WHERE d.user_id = $1`,
          [req.user.id]
        );
        if (assistantDoctor.rows[0]) {
          await Patient.assignToDoctor(patient.id, assistantDoctor.rows[0].id);
        }
      }

      res.status(201).json({
        message: 'Patient created successfully.',
        patient: { id: patient.id, userId: user.id, email, firstName, lastName },
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async search(req, res) {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: 'Search query required.' });
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const results = await Patient.search(q, { page, limit });
      res.json(results);
    } catch (error) {
      console.error('Search patient error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getById(req, res) {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });

      const consultations = await Patient.getConsultations(req.params.id);
      const documents = await Patient.getDocuments(req.params.id);
      const invoices = await Patient.getInvoices(req.params.id);

      const prescriptions = [];
      for (const c of consultations) {
        const meds = await require('../models').Consultation.getPrescriptions(c.id);
        prescriptions.push(...meds);
      }

      res.json({
        patient,
        consultations,
        documents,
        invoices,
        prescriptions,
      });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getMyProfile(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

      const consultations = await Patient.getConsultations(patient.id);
      const documents = await Patient.getDocuments(patient.id);
      const invoices = await Patient.getInvoices(patient.id);

      const prescriptions = [];
      for (const c of consultations) {
        const meds = await require('../models').Consultation.getPrescriptions(c.id);
        prescriptions.push(...meds);
      }

      res.json({ patient, consultations, documents, invoices, prescriptions });
    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getDoctors(req, res) {
    try {
      const { name, specialization, city } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const db = require('../config/db');
      let baseSql = `SELECT d.*, u.email, u.first_name, u.last_name, u.phone, s.name as specialization_name
                     FROM doctors d
                     JOIN users u ON d.user_id = u.id
                     LEFT JOIN specializations s ON d.specialization_id = s.id`;
      let countSql = `SELECT COUNT(*) FROM doctors d
                      JOIN users u ON d.user_id = u.id
                      LEFT JOIN specializations s ON d.specialization_id = s.id`;
      let where = ' WHERE 1=1';
      const params = [];
      let idx = 1;

      if (name) {
        const clause = ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx})`;
        where += clause;
        params.push(`%${name}%`);
        idx++;
      }
      if (specialization) {
        const clause = ` AND (s.name ILIKE $${idx} OR d.specialization ILIKE $${idx})`;
        where += clause;
        params.push(`%${specialization}%`);
        idx++;
      }
      if (city) {
        const clause = ` AND d.city ILIKE $${idx}`;
        where += clause;
        params.push(`%${city}%`);
      }

      const result = await db.paginate(
        baseSql + where + ' ORDER BY u.last_name',
        countSql + where,
        params,
        { page, limit }
      );

      // Map specialization_name to specialization for backward compatibility
      result.data = result.data.map(d => ({
        ...d,
        specialization: d.specialization_name || d.specialization
      }));

      res.json(result);
    } catch (error) {
      console.error('Get doctors error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = patientController;
