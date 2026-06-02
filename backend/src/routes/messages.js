const router = require('express').Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', messageController.send);
router.get('/colleagues', messageController.getColleagues);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/conversations', messageController.getConversations);
router.get('/:userId', messageController.getConversation);
router.put('/:id/read', messageController.markAsRead);

module.exports = router;
