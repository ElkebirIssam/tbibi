const { Doctor, User, Patient, Specialization, AuditLog } = require('../models');

const doctorController = {
  async getAssistants(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      const assistants = await Doctor.getAssistants(doctor.id);
      res.json(assistants);
    } catch (error) {
      console.error('Get assistants error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getPatients(req, res) {
    try {
      let doctorId;
      if (['assistant', 'nurse'].includes(req.user.role)) {
        const user = await User.findById(req.user.id);
        doctorId = user.doctor_id;
        if (!doctorId) return res.status(400).json({ error: 'No doctor linked to your account.' });
      } else {
        const doctor = await Doctor.findByUserId(req.user.id);
        doctorId = doctor.id;
      }
      const patients = await Doctor.getPatients(doctorId);
      res.json(patients);
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async updateProfile(req, res) {
    try {
      const { specializationId, licenseNumber, consultationFee, bio, availableDays } = req.body;
      const doctor = await Doctor.findByUserId(req.user.id);

      if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

      const updates = {};
      if (specializationId) {
        updates.specialization_id = specializationId;
        // Auto-resolve display name
        const spec = await Specialization.findById(specializationId);
        if (spec) updates.specialization = spec.name;
      }
      if (licenseNumber) updates.license_number = licenseNumber;
      if (consultationFee) updates.consultation_fee = consultationFee;
      if (bio) updates.bio = bio;
      if (availableDays) updates.available_days = availableDays;

      const updated = await Doctor.update(doctor.id, updates);
      res.json({ message: 'Profile updated.', doctor: updated });
    } catch (error) {
      console.error('Update doctor error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async createAssistant(req, res) {
    try {
      const { email, password, firstName, lastName, phone, role } = req.body;
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const existingUser = await User.findByEmail(email);
      if (existingUser) return res.status(400).json({ error: 'Email already exists.' });

      const assistantRole = role === 'nurse' ? 'nurse' : 'assistant';
      const doctor = await Doctor.findByUserId(req.user.id);

      const user = await User.create({
        email,
        passwordHash,
        role: assistantRole,
        firstName,
        lastName,
        phone,
        isActive: true,
      });

      // Link assistant to the doctor who created them
      if (doctor) {
        await User.update(user.id, { is_verified: true, doctor_id: doctor.id });
      } else {
        await User.update(user.id, { is_verified: true });
      }

      await AuditLog.create({
        userId: req.user.id,
        action: 'CREATE_ASSISTANT',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      });

      res.status(201).json({ message: 'Assistant created.', user: { id: user.id, email, firstName, lastName, role: assistantRole } });
    } catch (error) {
      console.error('Create assistant error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async removeAssistant(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user || !['assistant', 'nurse'].includes(user.role)) {
        return res.status(400).json({ error: 'Invalid assistant ID.' });
      }

      await User.delete(id);

      await AuditLog.create({
        userId: req.user.id,
        action: 'REMOVE_ASSISTANT',
        entityType: 'user',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ message: 'Assistant removed.' });
    } catch (error) {
      console.error('Remove assistant error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getAllDoctors(req, res) {
    try {
      const doctors = await Doctor.findAll();
      res.json(doctors);
    } catch (error) {
      console.error('Get all doctors error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async assignPatient(req, res) {
    try {
      const { patientId } = req.body;
      let doctorId;
      if (['assistant', 'nurse'].includes(req.user.role)) {
        const user = await User.findById(req.user.id);
        doctorId = user.doctor_id;
        if (!doctorId) return res.status(400).json({ error: 'No doctor linked to your account.' });
      } else {
        const doctor = await Doctor.findByUserId(req.user.id);
        doctorId = doctor.id;
      }
      const result = await Patient.assignToDoctor(patientId, doctorId);
      res.json({ message: 'Patient assigned.', linked: !!result });
    } catch (error) {
      console.error('Assign patient error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = doctorController;
