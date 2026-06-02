const { Message, AuditLog } = require('../models');

const messageController = {
  async send(req, res) {
    try {
      const { receiverId, subject, content } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ error: 'receiverId and content are required.' });
      }

      const message = await Message.create({
        senderId: req.user.id,
        receiverId,
        subject,
        content,
      });

      // Attach sender name for real-time display
      message.sender_first_name = req.user.firstName;
      message.sender_last_name = req.user.lastName;

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

  async getColleagues(req, res) {
    try {
      const { type } = req.query;
      const pool = require('../config/db').pool;
      const { Doctor, User } = require('../models');

      if (type === 'internal') {
        let doctorId = null;
        if (req.user.role === 'doctor') {
          const doctor = await Doctor.findByUserId(req.user.id);
          doctorId = doctor?.id;
        } else if (['assistant', 'nurse'].includes(req.user.role)) {
          const user = await User.findById(req.user.id);
          doctorId = user?.doctor_id;
        }
        if (!doctorId) return res.json([]);

        const { rows } = await pool.query(
          `SELECT u.id as user_id, u.first_name, u.last_name, u.role
           FROM users u
           WHERE (u.role = 'assistant' OR u.role = 'nurse') AND u.doctor_id = $1
           ORDER BY u.first_name`,
          [doctorId]
        );
        // Also include the doctor
        const { rows: doctorRows } = await pool.query(
          `SELECT u.id as user_id, u.first_name, u.last_name, u.role
           FROM users u
           JOIN doctors d ON d.user_id = u.id
           WHERE d.id = $1`,
          [doctorId]
        );
        const all = [...rows, ...doctorRows].filter(u => u.user_id !== req.user.id);
        return res.json(all);
      }

      if (type === 'external') {
        const { rows } = await pool.query(
          `SELECT u.id as user_id, u.first_name, u.last_name, u.role,
                  COALESCE(s.name, d.specialization) as specialization
           FROM users u
           JOIN doctors d ON d.user_id = u.id
           LEFT JOIN specializations s ON d.specialization_id = s.id
           WHERE u.role = 'doctor' AND u.id != $1
           ORDER BY u.first_name`,
          [req.user.id]
        );
        return res.json(rows);
      }

      res.json([]);
    } catch (error) {
      console.error('Get colleagues error:', error);
      res.status(500).json({ error: error.message || 'Server error.' });
    }
  },
};

module.exports = messageController;
