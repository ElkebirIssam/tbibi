const router = require('express').Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('doctor'));

router.get('/assistants', doctorController.getAssistants);
router.get('/patients', doctorController.getPatients);
router.put('/profile', doctorController.updateProfile);
router.post('/assistants', doctorController.createAssistant);
router.delete('/assistants/:id', doctorController.removeAssistant);
router.post('/assign-patient', doctorController.assignPatient);

module.exports = router;
