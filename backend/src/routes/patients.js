const router = require('express').Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('assistant', 'nurse', 'doctor', 'super_admin'), patientController.create);
router.get('/search', authorize('assistant', 'nurse', 'doctor', 'super_admin'), patientController.search);
router.get('/doctors', patientController.getDoctors);
router.get('/my-profile', authorize('patient'), patientController.getMyProfile);
router.get('/:id', authorize('assistant', 'nurse', 'doctor', 'super_admin', 'patient'), patientController.getById);
router.put('/:id', authorize('assistant', 'nurse', 'doctor', 'super_admin'), patientController.update);
router.get('/assurances/list', patientController.getAssurances);

module.exports = router;
