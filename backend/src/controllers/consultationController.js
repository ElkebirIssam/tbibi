const { Consultation, Document, Appointment, AuditLog, Doctor, Notification, User, Patient, Message } = require('../models');
const db = require('../config/db');
const { generatePrescription, generateSickCertificate, generateReferralLetter } = require('../utils/pdf');

const consultationController = {
  async create(req, res) {
    try {
      const { appointmentId, patientId, feeItemId, symptoms, report, diagnosis, prescribedRest } = req.body;
      const doctor = await require('../models').Doctor.findByUserId(req.user.id);

      if (!doctor) return res.status(403).json({ error: 'Only doctors can create consultations.' });

      let feeName = null;
      if (feeItemId) {
        const { FeeItem } = require('../models');
        const item = await FeeItem.findById(feeItemId);
        if (item) feeName = item.name;
      }

      const consultation = await Consultation.create({
        appointmentId,
        patientId,
        doctorId: doctor.id,
        feeItemId,
        feeName,
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

      // Auto-generate invoice if consultation has a fee item
      if (feeItemId) {
        try {
          const { Invoice, FeeItem } = require('../models');
          const feeItem = await FeeItem.findById(feeItemId);
          if (feeItem) {
            const today = new Date().toISOString().split('T')[0];
            const { rows: existing } = await db.query(
              `SELECT id, total FROM invoices
               WHERE doctor_id = $1 AND patient_id = $2
                 AND status = 'unpaid'
                 AND DATE(created_at) = $3
               LIMIT 1`,
              [doctor.id, patientId, today]
            );

            const description = `Consultation: ${feeItem.name}`;
            const itemTotal = parseFloat(feeItem.price);

            if (existing.length > 0) {
              const inv = existing[0];
              const { Invoice } = require('../models');
              await db.query(
                `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
                 VALUES ($1, $2, 1, $3, $4)`,
                [inv.id, description, itemTotal, itemTotal]
              );
              const newTotal = parseFloat(inv.total) + itemTotal;
              await db.query(
                `UPDATE invoices SET total = $1, amount = $1 WHERE id = $2`,
                [newTotal, inv.id]
              );
            } else {
              const { generateInvoiceNumber } = require('../utils/helpers');
              await Invoice.create({
                patientId,
                doctorId: doctor.id,
                invoiceNumber: generateInvoiceNumber(),
                amount: itemTotal,
                tax: 0,
                total: itemTotal,
                items: [{ description, quantity: 1, unitPrice: itemTotal, total: itemTotal }],
              });
            }
          }
        } catch (err) {
          console.error('Invoice auto-generation error:', err);
        }
      }
    } catch (error) {
      console.error('Create consultation error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getAll(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(400).json({ error: 'Doctor profile not found.' });
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const result = await Consultation.findByDoctor(doctor.id, { page, limit });
      res.json(result);
    } catch (error) {
      console.error('Get consultations error:', error);
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

  async requestAccess(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(403).json({ error: 'Only doctors can request access.' });
      const requester = await User.findById(req.user.id);
      const requesterDoctor = await Doctor.findByUserId(req.user.id);
      const { id } = req.params;
      const { resendSide } = req.body || {}; // 'both' | 'doctor' | 'patient' | null
      const consultation = await Consultation.findById(id);
      if (!consultation) return res.status(404).json({ error: 'Consultation not found.' });
      if (consultation.doctor_id === doctor.id) {
        return res.status(400).json({ error: 'You already have access to your own consultation.' });
      }

      let result;
      const existing = await Consultation.findAccessRequestByConsultation(id, doctor.id);
      const isResend = !!existing;
      if (!existing) {
        result = await Consultation.requestAccess(id, doctor.id);
        result.doctor_status = 'pending';
        result.patient_status = 'pending';
      } else {
        // Smart resend: update statuses based on resendSide
        const newDoctorStatus = !resendSide || resendSide === 'both' || resendSide === 'doctor' ? 'pending' : existing.status;
        const newPatientStatus = !resendSide || resendSide === 'both' || resendSide === 'patient' ? 'pending' : existing.patient_status;
        result = await Consultation.updateAccessStatus(existing.id, newDoctorStatus, newPatientStatus);
        result.doctor_status = newDoctorStatus;
        result.patient_status = newPatientStatus;
      }

      const io = req.app.get('io');
      const targetDoctor = await Doctor.findById(consultation.doctor_id);
      const patient = await Patient.findById(consultation.patient_id);
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Inconnu';
      const patientCode = patient?.patient_code || '';
      const requesterSpec = requesterDoctor?.specialization_name || 'Médecin';
      const consultationDate = new Date(consultation.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });
      const requesterLocation = requesterDoctor?.cabinet_address
        ? `${requesterSpec} en cabinet libéral à ${requesterDoctor.city || ''} (${requesterDoctor.cabinet_address})`
        : requesterDoctor?.city
          ? `${requesterSpec} à ${requesterDoctor.city}`
          : requesterSpec;
      const requesterSignature = `Docteur ${requester.first_name} ${requester.last_name}\n${requesterLocation}`;

      if (targetDoctor) {
        // Create formal message to target doctor
        const msgToDoctor = await Message.create({
          senderId: req.user.id,
          receiverId: targetDoctor.user_id,
          subject: `Demande d'accès aux consultations du patient ${patientName}`,
          content: `Bonjour Docteur ${targetDoctor.last_name},\n\n` +
            `Je me présente : Docteur ${requester.first_name} ${requester.last_name}, ${requesterLocation}.\n\n` +
            `Dans le cadre du suivi du patient ${patientName}, j'ai constaté, au vu de son dossier médical, qu'il a bénéficié de consultations auprès de vous.\n\n` +
            `Je vous prie de bien vouloir m'accorder l'accès à ces consultations dans un but exclusivement médical, afin de poursuivre mon diagnostic et d'assurer la continuité des soins.\n\n` +
            `Une demande d'autorisation a également été adressée au patient ${patientName}. Dès lors que vous et le patient aurez accepté cette demande, je pourrai consulter les informations nécessaires à ma prise en charge.\n\n` +
            `Je vous remercie par avance pour votre compréhension et votre collaboration.\n\n` +
            `Bien cordialement,\n${requesterSignature}`
        });
        io.to(`user:${targetDoctor.user_id}`).emit('new_message', msgToDoctor);

        await Notification.create({
          userId: targetDoctor.user_id,
          type: 'access_request',
          title: 'Demande d\'accès à une consultation',
          message: `Dr. ${requester.first_name} ${requester.last_name} (${requesterSpec}) demande l'accès à la consultation du patient ${patientName} en date du ${consultationDate}.`,
          data: {
            accessRequestId: result.id, consultationId: id,
            requestingDoctorId: doctor.id, requestingDoctorUserId: req.user.id,
            requestingDoctorName: `Dr. ${requester.first_name} ${requester.last_name}`,
            patientId: consultation.patient_id, patientName, status: 'pending',
            messageId: msgToDoctor.id
          },
        });
        const count = await Notification.getUnreadCount(targetDoctor.user_id);
        io.to(`user:${targetDoctor.user_id}`).emit('notification_count', count);
      }

      // Create formal message to patient
      const patientUser = patient ? await User.findById(patient.user_id) : null;
      if (patientUser) {
        const msgToPatient = await Message.create({
          senderId: req.user.id,
          receiverId: patientUser.id,
          subject: 'Demande d\'accès à votre dossier médical',
          content: `Bonjour ${patientName},\n\n` +
            `Le Docteur ${requester.first_name} ${requester.last_name} (${requesterLocation}) a demandé l'accès à votre dossier médical.\n\n` +
            `Cette demande est en attente d'approbation par votre médecin traitant. Une fois approuvée, le docteur pourra consulter les informations nécessaires à votre prise en charge.\n\n` +
            `Cordialement,\nÉquipe Tbibi.tn`
        });
        io.to(`user:${patientUser.id}`).emit('new_message', msgToPatient);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Request access error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async checkAccess(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(403).json({ error: 'Only doctors can access this.' });
      const { id } = req.params;
      const hasAccess = await Consultation.checkAccess(id, doctor.id);
      res.json({ hasAccess });
    } catch (error) {
      console.error('Check access error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async respondToAccessRequest(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(403).json({ error: 'Only doctors can respond.' });
      const { id } = req.params;
      const { status } = req.body;
      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or denied.' });
      }

      const request = (await db.query(
        `SELECT r.*, c.doctor_id FROM consultation_access_requests r
         JOIN consultations c ON r.consultation_id = c.id WHERE r.id = $1`, [id]
      )).rows[0];
      if (!request) return res.status(404).json({ error: 'Access request not found.' });
      if (request.doctor_id !== doctor.id) {
        return res.status(403).json({ error: 'Not your consultation.' });
      }

      const result = await Consultation.respondToAccessRequest(id, status);

      const consultation = await Consultation.findById(request.consultation_id);
      const patient = consultation ? await Patient.findById(consultation.patient_id) : null;
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Inconnu';
      const responder = await User.findById(req.user.id);
      const requestingDoctor = await Doctor.findById(request.requesting_doctor_id);
      const doctorSpec = doctor?.specialization_name || 'Médecin';

      await db.query(
        `UPDATE notifications SET is_read = true, data = jsonb_set(data, '{status}', to_jsonb($2::text))
         WHERE data->>'accessRequestId' = $1 AND (data->>'status') IS NOT NULL`,
        [id, status]
      );

      const io = req.app.get('io');
      if (requestingDoctor) {
        const requesterUser = await User.findById(requestingDoctor.user_id);
        // Create formal response message
        const responderLocation = doctor?.cabinet_address
          ? `${doctorSpec} en cabinet libéral à ${doctor.city || ''} (${doctor.cabinet_address})`
          : doctor?.city
            ? `${doctorSpec} à ${doctor.city}`
            : doctorSpec;
        const responseMsg = await Message.create({
          senderId: req.user.id,
          receiverId: requestingDoctor.user_id,
          subject: `${status === 'approved' ? 'Accès accordé' : 'Accès refusé'} - ${patientName}`,
          content: `Bonjour Docteur ${requesterUser?.last_name || ''},\n\n` +
            `Je fais suite à votre demande d'accès aux consultations du patient ${patientName}.\n\n` +
            `Après examen de votre demande, j'ai le plaisir de vous informer que l'accès vous est ${status === 'approved' ? 'accordé' : 'refusé'}.\n\n` +
            `${status === 'approved'
              ? 'Vous pouvez désormais consulter les informations nécessaires à la continuité des soins de ce patient.'
              : 'Pour plus d\'informations, vous pouvez me contacter directement par messagerie.'}\n\n` +
            `Bien cordialement,\nDocteur ${responder.first_name} ${responder.last_name}\n${responderLocation}`
        });
        io.to(`user:${requestingDoctor.user_id}`).emit('new_message', responseMsg);

        await Notification.create({
          userId: requestingDoctor.user_id,
          type: 'access_response',
          title: status === 'approved' ? '✅ Accès accordé' : '❌ Accès refusé',
          message: `Dr. ${responder.first_name} ${responder.last_name} a ${status === 'approved' ? 'accepté' : 'refusé'} votre demande d'accès pour le patient ${patientName}.`,
          data: { accessRequestId: id, consultationId: request.consultation_id, status, patientName, doctorName: `Dr. ${responder.first_name} ${responder.last_name}`, doctorUserId: req.user.id, messageId: responseMsg.id },
        });
      }

      const responderUserId = doctor.user_id;
      const requesterCount = requestingDoctor ? await Notification.getUnreadCount(requestingDoctor.user_id) : 0;
      const responderCount = await Notification.getUnreadCount(responderUserId);
      io.to(`user:${responderUserId}`).emit('notification_count', responderCount);
      if (requestingDoctor) {
        io.to(`user:${requestingDoctor.user_id}`).emit('notification_count', requesterCount);
      }

      res.json(result);
    } catch (error) {
      console.error('Respond access request error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getAccessStatus(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(403).json({ error: 'Only doctors can access this.' });
      const { id } = req.params;
      const status = await Consultation.getAccessStatus(id, doctor.id);
      res.json(status);
    } catch (error) {
      console.error('Get access status error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async patientRespondToAccessRequest(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) return res.status(403).json({ error: 'Only patients can respond.' });
      const { id } = req.params;
      const { patientStatus } = req.body;
      if (!['approved', 'denied'].includes(patientStatus)) {
        return res.status(400).json({ error: 'Status must be approved or denied.' });
      }

      const request = (await db.query(
        `SELECT r.* FROM consultation_access_requests r WHERE r.id = $1`, [id]
      )).rows[0];
      if (!request) return res.status(404).json({ error: 'Access request not found.' });

      // Verify this patient is the one in the consultation
      const consultation = await Consultation.findById(request.consultation_id);
      if (!consultation || consultation.patient_id !== patient.id) {
        return res.status(403).json({ error: 'Not your consultation.' });
      }

      const result = await Consultation.patientRespondToAccessRequest(id, patientStatus);

      const patientUser = await User.findById(patient.user_id);
      const requestingDoctor = await Doctor.findById(request.requesting_doctor_id);
      const patientName = `${patient.first_name} ${patient.last_name}`;

      await db.query(
        `UPDATE notifications SET is_read = true, data = jsonb_set(data, '{patient_status}', to_jsonb($2::text))
         WHERE data->>'accessRequestId' = $1 AND (data->>'patient_status') IS NOT NULL`,
        [id, patientStatus]
      );

      const io = req.app.get('io');
      if (requestingDoctor) {
        const requesterUser = await User.findById(requestingDoctor.user_id);
        await Notification.create({
          userId: requestingDoctor.user_id,
          type: 'access_response',
          title: patientStatus === 'approved' ? '✅ Patient a accepté' : '❌ Patient a refusé',
          message: `Le patient ${patientName} a ${patientStatus === 'approved' ? 'accepté' : 'refusé'} la demande d'accès.`,
          data: { accessRequestId: id, consultationId: request.consultation_id, patient_status: patientStatus, patientName, requestingDoctorUserId: requestingDoctor.user_id },
        });
        const count = await Notification.getUnreadCount(requestingDoctor.user_id);
        io.to(`user:${requestingDoctor.user_id}`).emit('notification_count', count);
      }

      res.json(result);
    } catch (error) {
      console.error('Patient respond access request error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = consultationController;
