const { Notification } = require('../models');

const notificationController = {
  async list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await Notification.findByUser(req.user.id, { page, limit });
      res.json(result);
    } catch (error) {
      console.error('List notifications error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await Notification.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Unread count error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async markAsRead(req, res) {
    try {
      const notification = await Notification.markAsRead(req.params.id);
      if (!notification) return res.status(404).json({ error: 'Notification not found.' });
      res.json(notification);
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async markAllAsRead(req, res) {
    try {
      await Notification.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async remove(req, res) {
    try {
      const notification = await Notification.delete(req.params.id);
      if (!notification) return res.status(404).json({ error: 'Notification not found.' });
      res.json({ message: 'Notification deleted.' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = notificationController;
