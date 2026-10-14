const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const productService = require('./productService');
const emailService = require('./emailService');

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

// "Forgot password" codes: how long one works, how many wrong guesses are
// allowed (a 6-digit code has a million possibilities, so 5 guesses gives
// an attacker a 1 in 200,000 chance), and how long to wait before emailing
// another one (so nobody can fill someone's inbox)
const RESET_CODE_MINUTES = 15;
const MAX_RESET_ATTEMPTS = 5;
const RESEND_WAIT_SECONDS = 60;

/**
 * Creates an account and returns a token so the user is logged in straight away.
 * @returns {Promise<{ token: string, user: object }>}
 */
async function register({ name, email, password }) {
  validatePassword(password);

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
 * "Forgot password", step 1: emails a 6-digit code to the user.
 *
 * Does nothing (but doesn't fail) if there's no account with this email,
 * so the response doesn't reveal which emails have accounts. Also does
 * nothing if a code was sent in the last minute.
 */
async function requestPasswordReset(email) {
  // Checked first so the answer is the same whether or not the account exists
  emailService.assertConfigured();

  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordReset');
  if (!user) return;

  const lastSent = user.passwordReset?.sentAt;
  if (lastSent && Date.now() - lastSent.getTime() < RESEND_WAIT_SECONDS * 1000) return;

  // randomInt is the secure random number generator (Math.random is
  // predictable). padStart keeps leading zeros, e.g. 42 -> "000042".
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  // Email first, then save: if the email fails, the user's previous code
  // (if any) still works and they can simply try again
  await emailService.sendPasswordResetCode(user.email, code, RESET_CODE_MINUTES);
  user.passwordReset = {
    codeHash: await bcrypt.hash(code, SALT_ROUNDS),
    sentAt: new Date(),
    attempts: 0,
  };
  await user.save();
}

/**
 * "Forgot password", step 2: checks the emailed code and sets a new
 * password. Logs the user in, and logs out any other devices (old tokens
 * stop working; see config/passport.js).
 * @returns {Promise<{ token: string, user: object }>}
 */
async function resetPassword({ email, code, password }) {
  validatePassword(password);

  // Same message for a wrong, expired or used-up code, or an unknown email
  const invalid = new HttpError(400, 'That code is wrong or has expired. Check the email or request a new code.');

  const cleanCode = typeof code === 'string' ? code.trim() : '';
  if (!/^\d{6}$/.test(cleanCode)) throw invalid;

  // Find a code that is still valid and count this guess, in one database
  // step. Doing both at once means sending lots of guesses at the same time
  // can't get past the limit.
  const user = await User.findOneAndUpdate(
    {
      email: normalizeEmail(email),
      'passwordReset.attempts': { $lt: MAX_RESET_ATTEMPTS },
      'passwordReset.sentAt': { $gt: new Date(Date.now() - RESET_CODE_MINUTES * 60 * 1000) },
    },
    { $inc: { 'passwordReset.attempts': 1 } }
  ).select('+passwordReset');
  if (!user) throw invalid;

  const codeMatches = await bcrypt.compare(cleanCode, user.passwordReset.codeHash);
  if (!codeMatches) throw invalid;

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  // Each code works once
  user.passwordReset = undefined;
  await user.save();

  return { token: createToken(user), user };
}

/**
 * Permanently deletes a user's account and all their saved products.
 * Products go first: if something fails partway, the account still exists
 * and the user can try again, instead of products being left behind with
 * no owner.
 */
async function deleteAccount(userId) {
  await productService.deleteAllForUser(userId);
  await User.deleteOne({ _id: userId });
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

// Shared by register and resetPassword
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);
  }
}

module.exports = { register, login, requestPasswordReset, resetPassword, deleteAccount };
