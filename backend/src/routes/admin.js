const router = require('express').Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/toggle-active', adminController.toggleUserActive);
router.delete('/users/:id', adminController.deleteUser);
router.get('/payments', adminController.getPaymentVerifications);
router.put('/payments/:id/verify', adminController.verifyPayment);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
