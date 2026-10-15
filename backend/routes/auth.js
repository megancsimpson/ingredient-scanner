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
const { loginLimit, registerLimit, emailLimit, codeLimit } = require('../middleware/rateLimits');

const router = express.Router();

// Each route that could be abused has a rate limit (middleware/rateLimits.js):
// password guessing, mass sign-ups, flooding inboxes, guessing codes
router.post('/register', registerLimit, register);
router.post('/login', loginLimit, login);
router.post('/forgot-password', emailLimit, forgotPassword);
router.post('/reset-password', codeLimit, resetPassword);

// requireLogin, not requireAuth: these have to work before the email is
// verified (the app needs the profile to know it isn't, and a user who
// mistyped their email can delete the account and start over)
router.post('/send-verification', requireLogin, emailLimit, sendVerification);
router.post('/verify-email', requireLogin, codeLimit, verifyEmail);
router.get('/me', requireLogin, me);
router.delete('/me', requireLogin, deleteMe);

module.exports = router;
