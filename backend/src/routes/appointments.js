const router = require('express').Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/slots', appointmentController.getAvailableSlots);
router.post('/', appointmentController.create);
router.get('/', appointmentController.getAll);
router.get('/:id', appointmentController.getById);
router.put('/:id', appointmentController.update);
router.put('/:id/confirm', authorize('doctor', 'assistant'), appointmentController.confirm);
router.put('/:id/reject', authorize('doctor', 'assistant'), appointmentController.reject);
router.delete('/:id', appointmentController.delete);

module.exports = router;
