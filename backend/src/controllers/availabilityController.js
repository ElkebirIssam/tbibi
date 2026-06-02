const { DoctorAvailability, Doctor, AuditLog } = require('../models');

const availabilityController = {
  async getMyAvailability(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });
      const availability = await DoctorAvailability.findByDoctor(doctor.id);
      res.json(availability);
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async saveMyAvailability(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });
      const { slots } = req.body;
      if (!Array.isArray(slots)) {
        return res.status(400).json({ error: 'slots must be an array.' });
      }
      await DoctorAvailability.upsert(doctor.id, slots);

      await AuditLog.create({
        userId: req.user.id,
        action: 'UPDATE_AVAILABILITY',
        entityType: 'doctor',
        entityId: doctor.id,
        ipAddress: req.ip,
      });

      res.json({ message: 'Availability updated.' });
    } catch (error) {
      console.error('Save availability error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getDoctorAvailability(req, res) {
    try {
      const { doctorId } = req.params;
      const availability = await DoctorAvailability.findByDoctor(doctorId);
      res.json(availability);
    } catch (error) {
      console.error('Get doctor availability error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = availabilityController;
