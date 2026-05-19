const { Specialization, AuditLog } = require('../models');

const specializationController = {
  async list(req, res) {
    try {
      const activeOnly = req.query.active === 'true';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';

      // For dropdown selects, return all active without pagination
      if (req.query.all === 'true') {
        const specializations = await Specialization.findAllSimple(activeOnly);
        return res.json(specializations);
      }

      const result = await Specialization.findAll(activeOnly, { page, limit, search });
      res.json(result);
    } catch (error) {
      console.error('List specializations error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getById(req, res) {
    try {
      const specialization = await Specialization.findById(req.params.id);
      if (!specialization) return res.status(404).json({ error: 'Specialization not found.' });
      res.json(specialization);
    } catch (error) {
      console.error('Get specialization error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async create(req, res) {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required.' });

      const specialization = await Specialization.create({ name, description });

      await AuditLog.create({
        userId: req.user.id,
        action: 'CREATE_SPECIALIZATION',
        entityType: 'specialization',
        entityId: specialization.id,
        details: { name },
        ipAddress: req.ip,
      });

      res.status(201).json(specialization);
    } catch (error) {
      if (error.constraint === 'specializations_name_key') {
        return res.status(400).json({ error: 'Cette spécialité existe déjà.' });
      }
      console.error('Create specialization error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async update(req, res) {
    try {
      const { name, description } = req.body;
      const fields = {};
      if (name) fields.name = name;
      if (description !== undefined) fields.description = description;

      const specialization = await Specialization.update(req.params.id, fields);
      if (!specialization) return res.status(404).json({ error: 'Specialization not found.' });

      await AuditLog.create({
        userId: req.user.id,
        action: 'UPDATE_SPECIALIZATION',
        entityType: 'specialization',
        entityId: specialization.id,
        details: fields,
        ipAddress: req.ip,
      });

      res.json(specialization);
    } catch (error) {
      if (error.constraint === 'specializations_name_key') {
        return res.status(400).json({ error: 'Cette spécialité existe déjà.' });
      }
      console.error('Update specialization error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async toggleActive(req, res) {
    try {
      const specialization = await Specialization.toggleActive(req.params.id);
      if (!specialization) return res.status(404).json({ error: 'Specialization not found.' });

      await AuditLog.create({
        userId: req.user.id,
        action: specialization.is_active ? 'ACTIVATE_SPECIALIZATION' : 'DEACTIVATE_SPECIALIZATION',
        entityType: 'specialization',
        entityId: specialization.id,
        ipAddress: req.ip,
      });

      res.json(specialization);
    } catch (error) {
      console.error('Toggle specialization error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async remove(req, res) {
    try {
      const specialization = await Specialization.findById(req.params.id);
      if (!specialization) return res.status(404).json({ error: 'Specialization not found.' });

      await Specialization.delete(req.params.id);

      await AuditLog.create({
        userId: req.user.id,
        action: 'DELETE_SPECIALIZATION',
        entityType: 'specialization',
        entityId: req.params.id,
        details: { name: specialization.name },
        ipAddress: req.ip,
      });

      res.json({ message: 'Specialization deleted.' });
    } catch (error) {
      console.error('Delete specialization error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = specializationController;
