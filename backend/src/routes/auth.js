const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPasswordFixed);
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-payment', authController.verifyPayment);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/send-phone-code', authenticate, authController.sendPhoneCode);
router.post('/verify-phone', authenticate, authController.verifyPhone);
router.post('/send-email-verification', authenticate, authController.sendEmailVerification);

module.exports = router;
