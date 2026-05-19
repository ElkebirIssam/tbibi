const { Message, AuditLog } = require('../models');

const messageController = {
  async send(req, res) {
    try {
      const { receiverId, content } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ error: 'receiverId and content are required.' });
      }

      const message = await Message.create({
        senderId: req.user.id,
        receiverId,
        content,
      });

      // Emit via Socket.io if available
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${receiverId}`).emit('new_message', message);
      }

      res.status(201).json(message);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getConversation(req, res) {
    try {
      const { userId } = req.params;
      const messages = await Message.getConversation(req.user.id, userId);
      res.json(messages);
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const count = await Message.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const message = await Message.markAsRead(id);

      const io = req.app.get('io');
      if (io && message) {
        io.to(`user:${message.sender_id}`).emit('message_read', { id });
      }

      res.json(message);
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },

  async getConversations(req, res) {
    try {
      const conversations = await Message.getConversations(req.user.id);
      res.json(conversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Server error.' });
    }
  },
};

module.exports = messageController;
