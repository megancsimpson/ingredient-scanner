const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User');

/**
 * Teaches Passport how to check a JWT:
 *   1. read it from the "Authorization: Bearer <token>" header
 *   2. check its signature with JWT_SECRET and that it hasn't expired
 *   3. look up the user it belongs to
 * The auth middleware (middleware/auth.js) uses this on protected routes.
 */
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        // The account may have been deleted since the token was issued
        const user = await User.findById(payload.sub);
        if (!user) return done(null, false);

        // Tokens issued before the password was last reset stop working, so
        // a reset logs out every other device. "iat" (issued at) is in
        // seconds, so the reset time is rounded down to seconds too; the
        // token created right after the reset then still counts as newer.
        if (
          user.passwordChangedAt &&
          payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
        ) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
