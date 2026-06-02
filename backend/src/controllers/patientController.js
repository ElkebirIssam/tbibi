const { Patient, Doctor, Assurance, AuditLog } = require('../models');
const db = require('../config/db');

const patientController = {
  async create(req, res) {
    try {
      const {
        email, firstName, lastName, phone, address, password,
        dateOfBirth, gender, bloodGroup, allergies,
        emergencyContactName, emergencyContactPhone,
        insuranceProvider, insuranceNumber, nationalId
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
        nationalId,
      });

      // Auto-link patient to doctor
      if (req.user.role === 'doctor') {
        const doctor = await Doctor.findByUserId(req.user.id);
        if (doctor) await Patient.assignToDoctor(patient.id, doctor.id);
      } else if (['assistant', 'nurse'].includes(req.user.role)) {
        const doctorId = req.body.doctorId;
        if (doctorId) await Patient.assignToDoctor(patient.id, doctorId);
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
      const patientId = req.params.id;
      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });

      // Access control: verify relationship for non-patient/super_admin roles
      if (!['patient', 'super_admin'].includes(req.user.role)) {
        let doctorId = null;
        if (req.user.role === 'doctor') {
          const doctor = await Doctor.findByUserId(req.user.id);
          if (doctor) doctorId = doctor.id;
        } else if (['assistant', 'nurse'].includes(req.user.role)) {
          const db = require('../config/db');
          const result = await db.query('SELECT doctor_id FROM users WHERE id = $1', [req.user.id]);
          if (result.rows[0]?.doctor_id) doctorId = result.rows[0].doctor_id;
        }
        if (doctorId) {
          const link = await db.query(
            'SELECT 1 FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2',
            [doctorId, patientId]
          );
          if (link.rows.length === 0) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à consulter ce dossier patient.' });
          }
        }
      }

      // Audit log
      await AuditLog.create({
        userId: req.user.id,
        action: 'VIEW_PATIENT',
        entityType: 'patient',
        entityId: patientId,
        ipAddress: req.ip,
      });

      const consultations = await Patient.getConsultations(patientId);
      const documents = await Patient.getDocuments(patientId);
      const invoices = await Patient.getInvoices(patientId);

      const prescriptions = [];
      for (const c of consultations) {
        const meds = await require('../models').Consultation.getPrescriptions(c.id);
        prescriptions.push(...meds);
      }

      const labAnalyses = await Patient.getLabAnalysesForPatient(patientId);

      res.json({
        patient,
        consultations,
        documents,
        invoices,
        prescriptions,
        labAnalyses,
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

      const labAnalyses = await Patient.getLabAnalysesForPatient(patient.id);

      const { Appointment } = require('../models');
      const appointments = await Appointment.findByPatient(patient.id);

      res.json({ patient, consultations, documents, invoices, prescriptions, labAnalyses, appointments });
    } catch (error) {
      console.error('Get my profile error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const patient = await Patient.findById(id);
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });

      const patientFields = ['date_of_birth', 'birth_place', 'city', 'gender', 'blood_group', 'allergies', 'chronic_diseases', 'emergency_contact_name', 'emergency_contact_phone', 'insurance_provider', 'insurance_number', 'national_id'];
      const patientUpdates = {};
      for (const field of patientFields) {
        if (req.body[field] !== undefined) {
          patientUpdates[field] = req.body[field];
        }
      }

      const userFields = ['phone', 'address'];
      const userUpdates = {};
      for (const field of userFields) {
        if (req.body[field] !== undefined) {
          userUpdates[field] = req.body[field];
        }
      }

      if (Object.keys(patientUpdates).length > 0) {
        const keys = Object.keys(patientUpdates);
        const values = Object.values(patientUpdates);
        const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        await db.query(
          `UPDATE patients SET ${setClause} WHERE id = $1`,
          [id, ...values]
        );
      }

      if (Object.keys(userUpdates).length > 0) {
        const { User } = require('../models');
        await User.update(patient.user_id, userUpdates);
      }

      res.json({ message: 'Patient updated successfully.' });
    } catch (error) {
      console.error('Update patient error:', error);
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

  async getAssurances(req, res) {
    try {
      const assurances = await Assurance.findAll();
      res.json(assurances);
    } catch (error) {
      console.error('Get assurances error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = patientController;
