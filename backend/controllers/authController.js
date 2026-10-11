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

module.exports = { register, login, me, deleteMe };
