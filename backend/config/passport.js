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
        return done(null, user || false);
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;
