const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  register, validateRegister,
  login, validateLogin,
  logout, currentUser,
  changePassword, validateChangePassword,
  refreshToken, verifyEmail,
  forgotPassword, validateForgotPassword,
  resetPassword, validateResetPassword,
  resendVerification
} = require('../controllers/auth.controller');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', auth(), logout);
router.get('/current-user', auth(), currentUser);
router.post('/change-password', auth(), validateChangePassword, changePassword);
router.post('/refresh-token', refreshToken);
router.get('/verify-email/:verificationToken', verifyEmail);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password/:resetToken', validateResetPassword, resetPassword);
router.post('/resend-email-verification', auth(), resendVerification);

module.exports = router;