const passport = require('../config/passport');

/**
 * Protects a route: only requests with a valid login token get through.
 * The logged-in user is available to the controller as req.user.
 *
 *   router.get('/', requireAuth, controller);
 *
 * Passport's default sends a plain-text "Unauthorized"; this sends the same
 * { error } JSON as every other error, so the app can handle it the same way.
 */
function requireAuth(req, res, next) {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }
    req.user = user;
    next();
  })(req, res, next);
}

module.exports = { requireAuth };
