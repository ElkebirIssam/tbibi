const router = require('express').Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', invoiceController.list);
router.post('/', authorize('assistant', 'nurse', 'doctor', 'super_admin'), invoiceController.create);
router.get('/:id', invoiceController.getById);
router.get('/:id/pdf', invoiceController.generatePdf);
router.put('/:id/status', authorize('assistant', 'nurse', 'doctor', 'super_admin'), invoiceController.updateStatus);
router.post('/:id/split', authorize('assistant', 'nurse', 'doctor', 'super_admin'), invoiceController.split);

module.exports = router;
