const { Appointment, Patient, Doctor, Notification, AuditLog, DoctorAvailability } = require('../models');
const db = require('../config/db');

async function sendAppointmentNotification(io, appointmentId, status, rejectionReason) {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return;

    let title, message;
    if (status === 'confirmed') {
      title = 'Rendez-vous confirmé';
      message = `Votre rendez-vous avec Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name} du ${new Date(appointment.start_time).toLocaleDateString('fr-TN')} à ${new Date(appointment.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })} a été confirmé.`;
      if (appointment.booked_for) {
        message += ` (Pour le compte de : ${appointment.booked_for})`;
      }
    } else if (status === 'cancelled') {
      title = 'Rendez-vous refusé';
      message = `Votre rendez-vous avec Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name} du ${new Date(appointment.start_time).toLocaleDateString('fr-TN')} a été refusé.`;
      if (rejectionReason) message += ` Motif : ${rejectionReason}`;
    } else {
      title = 'Nouvelle demande de rendez-vous';
      message = `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name} a reçu votre demande de rendez-vous du ${new Date(appointment.start_time).toLocaleDateString('fr-TN')} à ${new Date(appointment.start_time).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}. En attente de confirmation.`;
      if (appointment.booked_for) {
        message += ` (Pour le compte de : ${appointment.booked_for})`;
      }
    }

    const patient = await Patient.findById(appointment.patient_id);
    if (!patient) return;

    const notification = await Notification.create({
      userId: patient.user_id,
      type: 'appointment_' + status,
      title,
      message,
      data: { appointmentId: appointment.id, status },
    });

    if (io) {
      io.to(`user:${patient.user_id}`).emit('notification', notification);
      io.to(`user:${patient.user_id}`).emit('notification_count', await Notification.getUnreadCount(patient.user_id));
    }
  } catch (err) {
    console.error('Send notification error:', err);
  }
}

const appointmentController = {
  async getAvailableSlots(req, res) {
    try {
      const { doctorId, date } = req.query;
      if (!doctorId || !date) {
        return res.status(400).json({ error: 'doctorId and date are required.' });
      }
      const slots = await DoctorAvailability.getAvailableSlots(doctorId, date);
      res.json(slots);
    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async create(req, res) {
    try {
      let { doctorId, patientId, assistantId, title, startTime, endTime, notes, bookedFor, status } = req.body;

      // Auto-resolve doctorId for doctors/assistants/nurses
      if (!doctorId) {
        if (req.user.role === 'doctor') {
          const doctor = await Doctor.findByUserId(req.user.id);
          if (doctor) doctorId = doctor.id;
        } else if (['assistant', 'nurse'].includes(req.user.role)) {
          const user = await db.query('SELECT doctor_id FROM users WHERE id = $1', [req.user.id]);
          if (user.rows[0]?.doctor_id) doctorId = user.rows[0].doctor_id;
        }
      }

      if (!doctorId || !patientId || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required fields: doctorId, patientId, startTime, endTime.' });
      }

      // Only doctors can create directly confirmed appointments
      const appointmentStatus = (status === 'confirmed' && req.user.role === 'doctor') ? 'confirmed' : 'pending';

      const dateStr = new Date(startTime).toISOString().slice(0, 10);
      const existing = await Appointment.findByPatientAndDate(patientId, dateStr);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Vous avez déjà un rendez-vous programmé pour cette date.' });
      }

      const resolvedAssistantId = assistantId || (req.user.role === 'assistant' ? req.user.id : null);

      const appointment = await Appointment.create({
        doctorId,
        patientId,
        assistantId: resolvedAssistantId,
        title,
        startTime,
        endTime,
        notes,
        bookedFor,
        status: appointmentStatus,
      });

      const io = req.app.get('io');
      sendAppointmentNotification(io, appointment.id, appointmentStatus);

      await AuditLog.create({
        userId: req.user.id,
        action: 'CREATE_APPOINTMENT',
        entityType: 'appointment',
        entityId: appointment.id,
        ipAddress: req.ip,
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getAll(req, res) {
    try {
      const { startDate, endDate, doctorId, status } = req.query;

      if (doctorId) {
        const appointments = await Appointment.findByDoctor(doctorId, startDate, endDate);
        if (req.user.role === 'patient') {
          const sanitized = appointments.map(({ patient_first_name, patient_last_name, patient_email, patient_phone, ...rest }) => rest);
          return res.json(sanitized);
        }
        return res.json(appointments);
      }

      let appointments;
      if (req.user.role === 'doctor') {
        const doctor = await require('../models').Doctor.findByUserId(req.user.id);
        appointments = await Appointment.findByDoctor(doctor.id, startDate, endDate);
      } else if (req.user.role === 'patient') {
        const patient = await Patient.findByUserId(req.user.id);
        appointments = await Appointment.findByPatient(patient.id, startDate, endDate);
      } else if (['assistant', 'nurse'].includes(req.user.role)) {
        // Get the doctor this assistant works for
        const currentUser = await require('../models').User.findById(req.user.id);
        if (currentUser && currentUser.doctor_id) {
          appointments = await Appointment.findByDoctor(currentUser.doctor_id, startDate, endDate);
        } else {
          appointments = [];
        }
      } else if (req.user.role === 'super_admin') {
        const { rows } = await require('../config/db').query(
          `SELECT a.*, p.patient_code, u.first_name as patient_first_name, u.last_name as patient_last_name,
                  doc_user.first_name as doctor_first_name, doc_user.last_name as doctor_last_name,
                  CASE WHEN c.id IS NOT NULL THEN true
                       WHEN EXISTS (SELECT 1 FROM consultations c2 WHERE c2.patient_id = a.patient_id AND c2.doctor_id = a.doctor_id AND c2.created_at::date = a.start_time::date) THEN true
                       ELSE false END as has_consultation
           FROM appointments a
           JOIN patients p ON a.patient_id = p.id
           JOIN users u ON p.user_id = u.id
           JOIN doctors d ON a.doctor_id = d.id
           JOIN users doc_user ON d.user_id = doc_user.id
           LEFT JOIN consultations c ON c.appointment_id = a.id
           ORDER BY a.start_time`
        );
        appointments = rows;
      }

      if (status) {
        appointments = (appointments || []).filter(a => a.status === status);
      }

      res.json(appointments || []);
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getById(req, res) {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
      res.json(appointment);
    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async update(req, res) {
    try {
      const allowedFields = ['title', 'startTime', 'endTime', 'status', 'notes'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update.' });
      }

      const appointment = await Appointment.update(req.params.id, updates);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });

      if (updates.status && ['confirmed', 'cancelled'].includes(updates.status)) {
        const io = req.app.get('io');
        sendAppointmentNotification(io, req.params.id, updates.status);
      }

      await AuditLog.create({
        userId: req.user.id,
        action: 'UPDATE_APPOINTMENT',
        entityType: 'appointment',
        entityId: req.params.id,
        details: updates,
        ipAddress: req.ip,
      });

      res.json(appointment);
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async confirm(req, res) {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });

      if (req.user.role === 'doctor') {
        const doctor = await require('../models').Doctor.findByUserId(req.user.id);
        if (!doctor || appointment.doctor_id !== doctor.id) {
          return res.status(403).json({ error: 'Not your appointment.' });
        }
      }

      const updated = await Appointment.update(req.params.id, { status: 'confirmed', confirmed_at: new Date() });
      const io = req.app.get('io');
      sendAppointmentNotification(io, req.params.id, 'confirmed');

      await AuditLog.create({
        userId: req.user.id,
        action: 'CONFIRM_APPOINTMENT',
        entityType: 'appointment',
        entityId: req.params.id,
        ipAddress: req.ip,
      });

      res.json(updated);
    } catch (error) {
      console.error('Confirm appointment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async reject(req, res) {
    try {
      const { reason } = req.body;
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });

      if (req.user.role === 'doctor') {
        const doctor = await require('../models').Doctor.findByUserId(req.user.id);
        if (!doctor || appointment.doctor_id !== doctor.id) {
          return res.status(403).json({ error: 'Not your appointment.' });
        }
      }

      const updated = await Appointment.update(req.params.id, { status: 'cancelled', rejection_reason: reason || null });
      const io = req.app.get('io');
      sendAppointmentNotification(io, req.params.id, 'cancelled', reason);

      await AuditLog.create({
        userId: req.user.id,
        action: 'REJECT_APPOINTMENT',
        entityType: 'appointment',
        entityId: req.params.id,
        details: { reason },
        ipAddress: req.ip,
      });

      res.json(updated);
    } catch (error) {
      console.error('Reject appointment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async delete(req, res) {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });

      await Appointment.delete(req.params.id);

      await AuditLog.create({
        userId: req.user.id,
        action: 'DELETE_APPOINTMENT',
        entityType: 'appointment',
        entityId: req.params.id,
        ipAddress: req.ip,
      });

      res.json({ message: 'Appointment cancelled.' });
    } catch (error) {
      console.error('Delete appointment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = appointmentController;
