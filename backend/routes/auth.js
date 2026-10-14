const express = require('express');
const {
  register,
  login,
  sendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  me,
  deleteMe,
} = require('../controllers/authController');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// requireLogin, not requireAuth: these have to work before the email is
// verified (the app needs the profile to know it isn't, and a user who
// mistyped their email can delete the account and start over)
router.post('/send-verification', requireLogin, sendVerification);
router.post('/verify-email', requireLogin, verifyEmail);
router.get('/me', requireLogin, me);
router.delete('/me', requireLogin, deleteMe);

module.exports = router;
