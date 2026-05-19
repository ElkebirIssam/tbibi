const { Appointment, Patient, Notification, AuditLog } = require('../models');

async function sendAppointmentNotification(io, appointmentId, status) {
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return;

    const title = status === 'confirmed' ? 'Rendez-vous confirmé' : 'Rendez-vous annulé';
    const message = status === 'confirmed'
      ? `Votre rendez-vous avec Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name} du ${new Date(appointment.start_time).toLocaleDateString('fr-TN')} a été confirmé.`
      : `Votre rendez-vous avec Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name} du ${new Date(appointment.start_time).toLocaleDateString('fr-TN')} a été annulé.`;

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
  async create(req, res) {
    try {
      const { doctorId, patientId, assistantId, title, startTime, endTime, notes } = req.body;

      if (!doctorId || !patientId || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required fields: doctorId, patientId, startTime, endTime.' });
      }

      const appointment = await Appointment.create({
        doctorId,
        patientId,
        assistantId: assistantId || req.user.role === 'assistant' ? req.user.id : null,
        title,
        startTime,
        endTime,
        notes,
      });

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
      const { startDate, endDate, doctorId } = req.query;

      // If doctorId is provided (e.g., patient viewing doctor's calendar), return appointments for that doctor
      if (doctorId) {
        const appointments = await Appointment.findByDoctor(doctorId, startDate, endDate);
        // Strip patient details for privacy
        const sanitized = appointments.map(({ patient_first_name, patient_last_name, patient_email, patient_phone, ...rest }) => rest);
        return res.json(sanitized);
      }

      let appointments;
      if (req.user.role === 'doctor') {
        const doctor = await require('../models').Doctor.findByUserId(req.user.id);
        appointments = await Appointment.findByDoctor(doctor.id, startDate, endDate);
      } else if (req.user.role === 'patient') {
        const patient = await Patient.findByUserId(req.user.id);
        appointments = await Appointment.findByPatient(patient.id, startDate, endDate);
      } else if (['assistant', 'nurse', 'super_admin'].includes(req.user.role)) {
        const { rows } = await require('../config/db').query(
          `SELECT a.*, u.first_name as patient_first_name, u.last_name as patient_last_name,
                  doc_user.first_name as doctor_first_name, doc_user.last_name as doctor_last_name
           FROM appointments a
           JOIN patients p ON a.patient_id = p.id
           JOIN users u ON p.user_id = u.id
           JOIN doctors d ON a.doctor_id = d.id
           JOIN users doc_user ON d.user_id = doc_user.id
           ORDER BY a.start_time`
        );
        appointments = rows;
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

      // Send notification if status changed to confirmed or cancelled
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
