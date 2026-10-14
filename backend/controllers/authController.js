const authService = require('../services/authService');

/**
 * POST /api/auth/register
 * Body:     { name, email, password }
 * Response: 201 { token, user }
 *           400 invalid input, 409 email already registered
 */
async function register(req, res) {
  const { name, email, password } = req.body || {};
  const result = await authService.register({ name, email, password });
  res.status(201).json(result);
}

/**
 * POST /api/auth/login
 * Body:     { email, password }
 * Response: 200 { token, user }
 *           401 wrong email or password
 */
async function login(req, res) {
  const { email, password } = req.body || {};
  const result = await authService.login({ email, password });
  res.json(result);
}

/**
 * POST /api/auth/send-verification  (logged in, email not yet verified)
 * Body:     { resend? }  true to replace a code that still works
 * Response: 204 (no body)
 *           502 email couldn't be sent, 503 email not set up
 */
async function sendVerification(req, res) {
  const { resend } = req.body || {};
  await authService.sendVerificationCode(req.user._id, { resend: resend === true });
  res.status(204).end();
}

/**
 * POST /api/auth/verify-email  (logged in, email not yet verified)
 * Body:     { code }
 * Response: 200 { user } (now with emailVerified: true)
 *           400 wrong or expired code
 */
async function verifyEmail(req, res) {
  const { code } = req.body || {};
  const user = await authService.verifyEmail(req.user._id, code);
  res.json({ user });
}

/**
 * POST /api/auth/forgot-password
 * Body:     { email }
 * Response: 200 { message } whether or not the email has an account
 *           502 email couldn't be sent, 503 email not set up
 */
async function forgotPassword(req, res) {
  const { email } = req.body || {};
  await authService.requestPasswordReset(email);
  res.json({ message: 'If an account exists for this email, we sent it a code.' });
}

/**
 * POST /api/auth/reset-password
 * Body:     { email, code, password }
 * Response: 200 { token, user } (logged in with the new password)
 *           400 wrong or expired code, or invalid password
 */
async function resetPassword(req, res) {
  const { email, code, password } = req.body || {};
  const result = await authService.resetPassword({ email, code, password });
  res.json(result);
}

/**
 * GET /api/auth/me  (logged in)
 * Response: 200 { user }
 */
function me(req, res) {
  res.json({ user: req.user });
}

/**
 * DELETE /api/auth/me  (logged in)
 * Deletes the account and all its saved products.
 * Response: 204 (no body)
 */
async function deleteMe(req, res) {
  await authService.deleteAccount(req.user._id);
  res.status(204).end();
}

module.exports = {
  register,
  login,
  sendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  me,
  deleteMe,
};
