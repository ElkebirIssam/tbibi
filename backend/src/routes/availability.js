const router = require('express').Router();
const availabilityController = require('../controllers/availabilityController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/my', authorize('doctor'), availabilityController.getMyAvailability);
router.put('/my', authorize('doctor'), availabilityController.saveMyAvailability);
router.get('/:doctorId', availabilityController.getDoctorAvailability);

module.exports = router;
