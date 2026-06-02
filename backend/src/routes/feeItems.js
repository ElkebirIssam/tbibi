const router = require('express').Router();
const feeItemController = require('../controllers/feeItemController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('doctor', 'assistant', 'nurse'), feeItemController.getAll);
router.get('/:id', authorize('doctor', 'assistant', 'nurse'), feeItemController.getById);
router.post('/', authorize('doctor'), feeItemController.create);
router.put('/:id', authorize('doctor'), feeItemController.update);
router.delete('/:id', authorize('doctor'), feeItemController.delete);

module.exports = router;
