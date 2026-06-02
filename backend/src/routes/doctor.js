const router = require('express').Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/assistants', authorize('doctor'), doctorController.getAssistants);
router.get('/patients', authorize('doctor', 'assistant', 'nurse'), doctorController.getPatients);
router.put('/profile', authorize('doctor'), doctorController.updateProfile);
router.post('/assistants', authorize('doctor'), doctorController.createAssistant);
router.delete('/assistants/:id', authorize('doctor'), doctorController.removeAssistant);
router.post('/assign-patient', authorize('doctor', 'assistant', 'nurse'), doctorController.assignPatient);

module.exports = router;
