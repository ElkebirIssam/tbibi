const { User, Doctor, Patient, PaymentVerification, AuditLog } = require('../models');

const adminController = {
  async getAllUsers(req, res) {
    try {
      const { role } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const users = await User.findAll(role, { page, limit, search });
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async toggleUserActive(req, res) {
    try {
      const { id } = req.params;
      const user = await User.toggleActive(id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      await AuditLog.create({
        userId: req.user.id,
        action: user.is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityType: 'user',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ message: `User ${user.is_active ? 'activated' : 'deactivated'}.`, user });
    } catch (error) {
      console.error('Toggle user error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

      const deleted = await User.delete(id);
      if (!deleted) return res.status(404).json({ error: 'Utilisateur introuvable.' });

      await AuditLog.create({
        userId: req.user.id,
        action: 'DELETE_USER',
        entityType: 'user',
        entityId: id,
        ipAddress: req.ip,
      });

      res.json({ message: 'Utilisateur supprimé.' });
    } catch (error) {
      console.error('Delete user error:', error);
      if (error.code === '23503') {
        return res.status(409).json({
          error: 'Impossible de supprimer cet utilisateur car il est lié à d\'autres enregistrements (rendez-vous, factures, messages). Supprimez d\'abord ses associations.',
        });
      }
      res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
    }
  },

  async getPaymentVerifications(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const payments = await PaymentVerification.findAll({ page, limit });
      res.json(payments);
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async verifyPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await PaymentVerification.verify(id, req.user.id);
      if (!payment) return res.status(404).json({ error: 'Payment not found.' });

      // Activate the user after payment verification
      await User.update(payment.user_id, { is_active: true, is_verified: true });

      await AuditLog.create({
        userId: req.user.id,
        action: 'VERIFY_PAYMENT',
        entityType: 'payment_verification',
        entityId: id,
        details: { verifiedUserId: payment.user_id },
        ipAddress: req.ip,
      });

      res.json({ message: 'Payment verified and user activated.', payment });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getAuditLogs(req, res) {
    try {
      const logs = await AuditLog.findAll(parseInt(req.query.limit) || 50);
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = adminController;
