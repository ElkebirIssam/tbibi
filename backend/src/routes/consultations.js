const router = require('express').Router();
const consultationController = require('../controllers/consultationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Patient-accessible routes (placed before doctor restrict)
router.get('/:id/access-status', consultationController.getAccessStatus);
router.put('/access-requests/:id/patient-respond', consultationController.patientRespondToAccessRequest);

router.use(authorize('doctor'));

router.get('/', consultationController.getAll);
router.post('/', consultationController.create);
router.post('/:consultationId/prescriptions', consultationController.addPrescription);
router.post('/:consultationId/lab-analyses', consultationController.addLabAnalysis);
router.get('/:consultationId/prescriptions', consultationController.getPrescriptions);
router.get('/:consultationId/lab-analyses', consultationController.getLabAnalyses);
router.post('/:patientId/:consultationId/generate-prescription', consultationController.generatePrescriptionDoc);
router.post('/:patientId/:consultationId/generate-certificate', consultationController.generateSickCertificateDoc);
router.post('/:patientId/:consultationId/generate-referral', consultationController.generateReferralLetterDoc);
router.post('/:id/request-access', consultationController.requestAccess);
router.get('/:id/check-access', consultationController.checkAccess);
router.put('/access-requests/:id/respond', consultationController.respondToAccessRequest);

module.exports = router;
