const { Doctor, FeeItem, AuditLog } = require('../models');

const feeItemController = {
  async getAll(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(400).json({ error: 'Doctor profile not found.' });
      const items = await FeeItem.findByDoctor(doctor.id);
      res.json(items);
    } catch (error) {
      console.error('Get fee items error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getById(req, res) {
    try {
      const item = await FeeItem.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Fee item not found.' });
      res.json(item);
    } catch (error) {
      console.error('Get fee item error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async create(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor) return res.status(400).json({ error: 'Doctor profile not found.' });
      const { name, description, price, category } = req.body;
      if (!name || price === undefined) return res.status(400).json({ error: 'Name and price are required.' });
      const item = await FeeItem.create({ doctorId: doctor.id, name, description, price, category });
      await AuditLog.create({ userId: req.user.id, action: 'CREATE_FEE_ITEM', entityType: 'fee_item', entityId: item.id, ipAddress: req.ip });
      res.status(201).json(item);
    } catch (error) {
      console.error('Create fee item error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async update(req, res) {
    try {
      const item = await FeeItem.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Fee item not found.' });
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || item.doctor_id !== doctor.id) return res.status(403).json({ error: 'Not authorized.' });
      const fields = {};
      if (req.body.name !== undefined) fields.name = req.body.name;
      if (req.body.description !== undefined) fields.description = req.body.description;
      if (req.body.price !== undefined) fields.price = req.body.price;
      if (req.body.category !== undefined) fields.category = req.body.category;
      if (req.body.is_active !== undefined) fields.is_active = req.body.is_active;
      const updated = await FeeItem.update(req.params.id, fields);
      res.json(updated);
    } catch (error) {
      console.error('Update fee item error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async delete(req, res) {
    try {
      const item = await FeeItem.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Fee item not found.' });
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || item.doctor_id !== doctor.id) return res.status(403).json({ error: 'Not authorized.' });
      await FeeItem.delete(req.params.id);
      await AuditLog.create({ userId: req.user.id, action: 'DELETE_FEE_ITEM', entityType: 'fee_item', entityId: req.params.id, ipAddress: req.ip });
      res.json({ message: 'Fee item deleted.' });
    } catch (error) {
      console.error('Delete fee item error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = feeItemController;
