const { Consultation, Document, Appointment, AuditLog } = require('../models');
const { generatePrescription, generateSickCertificate, generateReferralLetter } = require('../utils/pdf');

const consultationController = {
  async create(req, res) {
    try {
      const { appointmentId, patientId, symptoms, report, diagnosis, prescribedRest } = req.body;
      const doctor = await require('../models').Doctor.findByUserId(req.user.id);

      if (!doctor) return res.status(403).json({ error: 'Only doctors can create consultations.' });

      const consultation = await Consultation.create({
        appointmentId,
        patientId,
        doctorId: doctor.id,
        symptoms,
        report,
        diagnosis,
        prescribedRest,
      });

      if (appointmentId) {
        await Appointment.update(appointmentId, { status: 'completed' });
      }

      await AuditLog.create({
        userId: req.user.id,
        action: 'CREATE_CONSULTATION',
        entityType: 'consultation',
        entityId: consultation.id,
        ipAddress: req.ip,
      });

      res.status(201).json(consultation);
    } catch (error) {
      console.error('Create consultation error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async addPrescription(req, res) {
    try {
      const { consultationId } = req.params;
      const prescription = await Consultation.addPrescription(consultationId, req.body);
      res.status(201).json(prescription);
    } catch (error) {
      console.error('Add prescription error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async addLabAnalysis(req, res) {
    try {
      const { consultationId } = req.params;
      const analysis = await Consultation.addLabAnalysis(consultationId, req.body);
      res.status(201).json(analysis);
    } catch (error) {
      console.error('Add lab analysis error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getPrescriptions(req, res) {
    try {
      const { consultationId } = req.params;
      const prescriptions = await Consultation.getPrescriptions(consultationId);
      res.json(prescriptions);
    } catch (error) {
      console.error('Get prescriptions error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getLabAnalyses(req, res) {
    try {
      const { consultationId } = req.params;
      const analyses = await Consultation.getLabAnalyses(consultationId);
      res.json(analyses);
    } catch (error) {
      console.error('Get lab analyses error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async generatePrescriptionDoc(req, res) {
    try {
      const { patientId, consultationId } = req.params;
      const doctor = await require('../models').Doctor.findByUserId(req.user.id);
      const doctorUser = await require('../models').User.findById(req.user.id);
      const patient = await require('../models').Patient.findById(patientId);
      const patientUser = await require('../models').User.findById(patient.user_id);
      const prescriptions = await Consultation.getPrescriptions(consultationId);

      const pdfPath = await generatePrescription(doctorUser, patientUser, {}, prescriptions);

      const doc = await Document.create({
        doctorId: doctor.id,
        patientId,
        type: 'prescription',
        title: `Prescription - ${new Date().toLocaleDateString('fr-TN')}`,
        content: { prescriptions },
      });

      // In production, upload PDF to storage and save URL
      await require('../models').Document.updatePdfUrl(doc.id, pdfPath);

      res.json({ message: 'Prescription generated.', document: doc, pdfPath });
    } catch (error) {
      console.error('Generate prescription error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async generateSickCertificateDoc(req, res) {
    try {
      const { patientId, consultationId } = req.params;
      const doctorUser = await require('../models').User.findById(req.user.id);
      const doctor = await require('../models').Doctor.findByUserId(req.user.id);
      const patientUser = await require('../models').User.findById((await require('../models').Patient.findById(patientId)).user_id);
      const consultation = await Consultation.findById(consultationId);

      const pdfPath = await generateSickCertificate(doctorUser, patientUser, consultation);

      const doc = await Document.create({
        doctorId: doctor.id,
        patientId,
        type: 'sick_certificate',
        title: `Certificat de maladie - ${new Date().toLocaleDateString('fr-TN')}`,
        content: { consultationId },
      });

      await require('../models').Document.updatePdfUrl(doc.id, pdfPath);
      res.json({ message: 'Certificate generated.', document: doc, pdfPath });
    } catch (error) {
      console.error('Generate certificate error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async generateReferralLetterDoc(req, res) {
    try {
      const { patientId, consultationId } = req.params;
      const { doctorName, specialization, hospital, reason, notes } = req.body;
      const doctorUser = await require('../models').User.findById(req.user.id);
      const doctor = await require('../models').Doctor.findByUserId(req.user.id);
      const patientUser = await require('../models').User.findById((await require('../models').Patient.findById(patientId)).user_id);
      const consultation = await Consultation.findById(consultationId);

      const pdfPath = await generateReferralLetter(doctorUser, patientUser, consultation, {
        doctor_name: doctorName,
        specialization,
        hospital,
        reason,
        notes,
      });

      const doc = await Document.create({
        doctorId: doctor.id,
        patientId,
        type: 'referral_letter',
        title: `Lettre d'affectation - ${new Date().toLocaleDateString('fr-TN')}`,
        content: { consultationId, referralDetails: { doctorName, specialization, hospital, reason, notes } },
      });

      await require('../models').Document.updatePdfUrl(doc.id, pdfPath);
      res.json({ message: 'Referral letter generated.', document: doc, pdfPath });
    } catch (error) {
      console.error('Generate referral error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = consultationController;
