const router = require('express').Router();
const consultationController = require('../controllers/consultationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('doctor'));

router.post('/', consultationController.create);
router.post('/:consultationId/prescriptions', consultationController.addPrescription);
router.post('/:consultationId/lab-analyses', consultationController.addLabAnalysis);
router.get('/:consultationId/prescriptions', consultationController.getPrescriptions);
router.get('/:consultationId/lab-analyses', consultationController.getLabAnalyses);
router.post('/:patientId/:consultationId/generate-prescription', consultationController.generatePrescriptionDoc);
router.post('/:patientId/:consultationId/generate-certificate', consultationController.generateSickCertificateDoc);
router.post('/:patientId/:consultationId/generate-referral', consultationController.generateReferralLetterDoc);

module.exports = router;
