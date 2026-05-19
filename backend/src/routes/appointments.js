const router = require('express').Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', appointmentController.create);
router.get('/', appointmentController.getAll);
router.get('/:id', appointmentController.getById);
router.put('/:id', appointmentController.update);
router.delete('/:id', appointmentController.delete);

module.exports = router;
