const router = require('express').Router();
const specializationController = require('../controllers/specializationController');
const { authenticate, authorize } = require('../middleware/auth');

// Public list (no auth required, e.g. for registration page)
router.get('/', specializationController.list);
router.get('/:id', authenticate, specializationController.getById);

// Admin-only CRUD
router.post('/', authenticate, authorize('super_admin'), specializationController.create);
router.put('/:id', authenticate, authorize('super_admin'), specializationController.update);
router.patch('/:id/toggle', authenticate, authorize('super_admin'), specializationController.toggleActive);
router.delete('/:id', authenticate, authorize('super_admin'), specializationController.remove);

module.exports = router;
