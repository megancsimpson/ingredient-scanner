const passport = require('../config/passport');

/**
 * Protects a route: only requests with a valid login token from a user
 * whose email is verified get through. The logged-in user is available to
 * the controller as req.user.
 *
 *   router.get('/', requireAuth, controller);
 *
 * Use this for every route unless it has to work before the email is
 * verified; then use requireLogin.
 */
function requireAuth(req, res, next) {
  authenticate(req, res, next, { allowUnverified: false });
}

/**
 * Like requireAuth, but also lets in users whose email isn't verified yet.
 * Only for the routes they need to finish signing up: reading their
 * profile, verifying, and deleting the account.
 */
function requireLogin(req, res, next) {
  authenticate(req, res, next, { allowUnverified: true });
}

// Passport's default sends a plain-text "Unauthorized"; this sends the same
// { error } JSON as every other error, so the app can handle it the same way.
function authenticate(req, res, next, { allowUnverified }) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }
    if (!user.emailVerified && !allowUnverified) {
      // 403 (forbidden) rather than 401: the login is fine, but this isn't
      // allowed yet. The app shows the verification screen in this state,
      // so this only happens if something skips it.
      return res.status(403).json({ error: 'Please verify your email first.' });
    }
    req.user = user;
    next();
  })(req, res, next);
}

module.exports = { requireAuth, requireLogin };
