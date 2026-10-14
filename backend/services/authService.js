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

// Emailed 6-digit codes (forgot password and email verification): how long
// one works, how many wrong guesses are allowed (a 6-digit code has a
// million possibilities, so 5 guesses gives an attacker a 1 in 200,000
// chance), and how long to wait before emailing another one (so nobody can
// fill someone's inbox)
const CODE_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_WAIT_SECONDS = 60;

// Same message for a wrong, expired or used-up code, or an unknown email
const INVALID_CODE_MESSAGE = 'That code is wrong or has expired. Check the email or request a new code.';

/**
 * Creates an account and returns a token. The account starts unverified:
 * the app asks for the code from a verification email next (see
 * sendVerificationCode and verifyEmail).
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
 * Email verification, step 1: emails a 6-digit code to a logged-in user
 * whose email isn't verified yet. Does nothing if it's already verified, or
 * if a code was sent in the last minute.
 *
 * The app calls this when the verification screen opens (resend false) and
 * when "Send a new code" is tapped (resend true). Without resend, a code
 * that still works is kept, so reopening the app doesn't replace the code
 * in an email the user is about to type in.
 *
 * @param {string} userId
 * @param {{ resend?: boolean }} [options]
 */
async function sendVerificationCode(userId, { resend = false } = {}) {
  emailService.assertConfigured();

  const user = await User.findById(userId).select('+emailVerification');
  if (!user || user.emailVerified) return;

  const current = user.emailVerification;
  if (!resend && codeIsUsable(current)) return;
  if (sentRecently(current)) return;

  const code = generateCode();
  // Email first, then save: if the email fails, the previous code (if any)
  // still works and the user can simply try again
  await emailService.sendVerificationCode(user.email, user.name, code, CODE_MINUTES);
  user.emailVerification = await codeRecord(code);
  await user.save();
}

/**
 * Email verification, step 2: checks the emailed code and marks the email
 * as verified. Then sends the welcome email.
 * @returns {Promise<object>} the updated user
 */
async function verifyEmail(userId, code) {
  const user = await findUserWithCode({ _id: userId }, 'emailVerification', code);
  if (!user) throw new HttpError(400, INVALID_CODE_MESSAGE);

  user.emailVerified = true;
  user.emailVerification = undefined;
  await user.save();

  // No "await": the user shouldn't wait for Gmail, and a failed welcome
  // email isn't a problem worth showing. send() has already logged the
  // reason, so the error is just caught here.
  emailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

  return user;
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
  if (sentRecently(user.passwordReset)) return;

  const code = generateCode();
  // Email first, then save: if the email fails, the user's previous code
  // (if any) still works and they can simply try again
  await emailService.sendPasswordResetCode(user.email, code, CODE_MINUTES);
  user.passwordReset = await codeRecord(code);
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

  const user = await findUserWithCode({ email: normalizeEmail(email) }, 'passwordReset', code);
  if (!user) throw new HttpError(400, INVALID_CODE_MESSAGE);

  user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  // Each code works once
  user.passwordReset = undefined;
  // The code reached their inbox, which proves the email is theirs
  user.emailVerified = true;
  user.emailVerification = undefined;
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

// ----- Emailed codes, shared by password reset and email verification -----
// Each code is stored on the User as { codeHash, sentAt, attempts }, in
// either the passwordReset or the emailVerification field.

// A random 6-digit code. randomInt is the secure random number generator
// (Math.random is predictable). padStart keeps leading zeros: 42 -> "000042".
function generateCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

// What gets saved: only a hash of the code, like a password
async function codeRecord(code) {
  return { codeHash: await bcrypt.hash(code, SALT_ROUNDS), sentAt: new Date(), attempts: 0 };
}

function sentRecently(record) {
  return Boolean(record?.sentAt) && Date.now() - record.sentAt.getTime() < RESEND_WAIT_SECONDS * 1000;
}

// Not expired and not used up
function codeIsUsable(record) {
  return (
    Boolean(record?.sentAt) &&
    Date.now() - record.sentAt.getTime() < CODE_MINUTES * 60 * 1000 &&
    record.attempts < MAX_CODE_ATTEMPTS
  );
}

/**
 * Finds the user matching `filter` whose code in `field` is still usable,
 * counts this guess, and returns the user if the code is right (else null).
 *
 * Finding the code and counting the guess happen in one database step, so
 * sending lots of guesses at the same time can't get past the limit.
 */
async function findUserWithCode(filter, field, code) {
  const cleanCode = typeof code === 'string' ? code.trim() : '';
  if (!/^\d{6}$/.test(cleanCode)) return null;

  const user = await User.findOneAndUpdate(
    {
      ...filter,
      [`${field}.attempts`]: { $lt: MAX_CODE_ATTEMPTS },
      [`${field}.sentAt`]: { $gt: new Date(Date.now() - CODE_MINUTES * 60 * 1000) },
    },
    { $inc: { [`${field}.attempts`]: 1 } }
  ).select(`+${field}`);
  if (!user) return null;

  const codeMatches = await bcrypt.compare(cleanCode, user[field].codeHash);
  return codeMatches ? user : null;
}

module.exports = {
  register,
  login,
  sendVerificationCode,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  deleteAccount,
};
