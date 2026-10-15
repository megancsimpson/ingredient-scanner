const { rateLimit, ipKeyGenerator, MINUTE, HOUR, DAY } = require('express-rate-limit');

/**
 * Rate limits: how many requests one person can make in a period of time.
 * They stop someone guessing passwords, flooding inboxes or running up the
 * Google Vision bill (photos cost money after the first 1,000 a month).
 *
 * Each limit counts requests per "key" (an IP address, an email or a user)
 * in memory. Counts reset when the server restarts, which is fine for one
 * server; several servers would need a shared store such as Redis.
 *
 * Limits counted by IP address are generous, because people can share one:
 * a household on the same Wi-Fi, or a mobile carrier that puts many phones
 * behind one address.
 *
 * Every limit answers with the app's usual error shape and status 429
 * ("Too Many Requests"):  { "error": "Too many ... Please try again later." }
 */

// Shared settings. "draft-8" sends a standard RateLimit header saying how
// many requests are left; the old X-RateLimit-* headers are turned off.
function limit(options) {
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Respond like every other error (middleware/errorHandler.js)
    handler: (req, res, next, opts) => res.status(opts.statusCode).json({ error: opts.message }),
    ...options,
  });
}

// The IP address part of a key. ipKeyGenerator groups IPv6 addresses by
// network, since one person can easily switch between many IPv6 addresses.
const ip = (req) => ipKeyGenerator(req.ip);

/** Everything under /api: a backstop against floods of requests. */
const apiLimit = limit({
  windowMs: 15 * MINUTE,
  limit: 1000,
  message: 'Too many requests. Please wait a few minutes and try again.',
});

/**
 * Logging in: 10 wrong passwords per email per IP in 15 minutes. Only
 * failed logins count. Counting per email (not just per IP) means one
 * person's mistakes can never lock out someone else on the same network.
 */
const loginLimit = limit({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ip(req)}|${email}`;
  },
  message: 'Too many login attempts. Please wait 15 minutes and try again.',
});

/** Creating accounts: 20 per IP per hour. */
const registerLimit = limit({
  windowMs: HOUR,
  limit: 20,
  keyGenerator: ip,
  message: 'Too many accounts created. Please try again later.',
});

/**
 * Asking for an emailed code (forgot password, verification): 10 per IP
 * per hour. Each account already waits a minute between codes
 * (services/authService.js); this also stops one person sending codes to
 * many addresses, which would use up the Gmail account's daily limit.
 */
const emailLimit = limit({
  windowMs: HOUR,
  limit: 10,
  keyGenerator: ip,
  message: 'Too many emails requested. Please try again later.',
});

/**
 * Entering a code (verify email, reset password): 20 per IP in 15 minutes.
 * Each code already stops working after 5 wrong guesses; this stops one
 * person guessing across many codes.
 */
const codeLimit = limit({
  windowMs: 15 * MINUTE,
  limit: 20,
  keyGenerator: ip,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

/**
 * Reading photos: 50 per user per day. Counted per logged-in user (it runs
 * after requireAuth), so IP addresses don't matter. 50 is plenty for real
 * use; it stops a script running up the Google Vision bill.
 */
const photoLimit = limit({
  windowMs: DAY,
  limit: 50,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: "You've reached today's limit for photo scans. You can still paste ingredient lists.",
});

module.exports = { apiLimit, loginLimit, registerLimit, emailLimit, codeLimit, photoLimit };
