const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');

// How much work bcrypt does per hash. Each +1 doubles the time; 12 takes a
// fraction of a second, which is fine for a login but slow for an attacker
// trying millions of guesses.
const SALT_ROUNDS = 12;

// bcrypt only uses the first 72 bytes of a password, so longer ones are
// rejected rather than silently cut short
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

// How long a login lasts before the user has to log in again
const TOKEN_EXPIRES_IN = '7d';

/**
 * Creates an account and returns a token so the user is logged in straight away.
 * @returns {Promise<{ token: string, user: object }>}
 */
async function register({ name, email, password }) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);
  }

  const normalizedEmail = normalizeEmail(email);
  if (await User.exists({ email: normalizedEmail })) {
    throw new HttpError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  // Mongoose checks the email format and name here (see models/User.js)
  const user = await User.create({ name, email: normalizedEmail, passwordHash });

  return { token: createToken(user), user };
}

/**
 * Checks an email and password and returns a token if they're correct.
 * @returns {Promise<{ token: string, user: object }>}
 */
async function login({ email, password }) {
  // Same message whether the email or the password is wrong, so the response
  // doesn't reveal which emails have accounts
  const invalid = new HttpError(401, 'Incorrect email or password.');

  if (typeof password !== 'string' || password === '') throw invalid;

  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
  if (!user) throw invalid;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw invalid;

  return { token: createToken(user), user };
}

/**
 * A signed token that proves who the user is. "sub" (subject) is the
 * standard JWT field for the user's ID. The token is signed, not encrypted:
 * anyone can read it, but only the server can create a valid one.
 */
function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

module.exports = { register, login };
