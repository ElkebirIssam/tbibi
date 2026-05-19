const router = require('express').Router();
const locationController = require('../controllers/locationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/villes', locationController.getVilles);
router.get('/delegations', locationController.getDelegations);

module.exports = router;
