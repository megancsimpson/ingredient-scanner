const nodemailer = require('nodemailer');
const HttpError = require('../utils/httpError');

/**
 * Sends emails from the app's Gmail account using nodemailer.
 *
 * This is the only file that knows how email is sent. Switching to a
 * service such as Resend or SendGrid (see docs/ARCHITECTURE.md, "Open
 * decisions") only means changing createTransport() below.
 *
 * Gmail needs an "app password", not the account's normal password:
 * turn on 2-Step Verification for the Google account, then create one at
 * https://myaccount.google.com/apppasswords. Put the address in EMAIL_USER
 * and the 16-letter app password in EMAIL_APP_PASSWORD in backend/.env.
 */

// Created on first use, so the server can start without email set up
let transporter = null;

function isConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      // nodemailer knows Gmail's server settings (smtp.gmail.com, port 465)
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

/**
 * Throws a 503 if email isn't set up. Call this before doing any work that
 * ends in sending an email, so the response is the same whether or not
 * the user exists.
 */
function assertConfigured() {
  if (!isConfigured()) {
    // Like photo scanning, email is optional for running the server, so
    // this is checked here rather than at startup
    console.error('EMAIL_USER or EMAIL_APP_PASSWORD is not set in backend/.env');
    throw new HttpError(503, "Password reset isn't available right now. Please try again later.");
  }
}

/**
 * Emails a password reset code.
 * @param {string} to the user's email address
 * @param {string} code the 6-digit code
 * @param {number} minutesValid how long the code works for
 */
async function sendPasswordResetCode(to, code, minutesValid) {
  assertConfigured();

  await send({
    to,
    subject: `Your Ingredient Scanner code: ${code}`,
    text:
      `Your code to reset your Ingredient Scanner password is:\n\n` +
      `${code}\n\n` +
      `Enter it in the app within ${minutesValid} minutes.\n\n` +
      `If you didn't ask to reset your password, you can ignore this email; ` +
      `your password hasn't changed.`,
  });
}

/**
 * Emails a code that proves the address belongs to the person who signed up.
 * @param {string} to the user's email address
 * @param {string} name the user's name
 * @param {string} code the 6-digit code
 * @param {number} minutesValid how long the code works for
 */
async function sendVerificationCode(to, name, code, minutesValid) {
  assertConfigured();

  await send({
    to,
    subject: `Confirm your email for Ingredient Scanner: ${code}`,
    text:
      `Hi ${name},\n\n` +
      `Thanks for signing up for Ingredient Scanner. Your code to confirm your ` +
      `email address is:\n\n` +
      `${code}\n\n` +
      `Enter it in the app within ${minutesValid} minutes.\n\n` +
      `If you didn't create an Ingredient Scanner account, you can ignore this ` +
      `email; the account can't be used without this code.`,
  });
}

/**
 * Emails a newly verified user a short welcome. Optional: does nothing if
 * email isn't set up.
 * @param {string} to the user's email address
 * @param {string} name the user's name
 */
async function sendWelcomeEmail(to, name) {
  if (!isConfigured()) return;

  await send({
    to,
    subject: 'Welcome to Ingredient Scanner',
    text:
      `Hi ${name},\n\n` +
      `Welcome to Ingredient Scanner! Your account is ready.\n\n` +
      `To check a product, open the Scan tab and take a photo of the ingredient list, ` +
      `or paste it in. The app flags any ingredients on our pore-clogging list, which was ` +
      `compiled by licensed estheticians from the Acne Clinic NYC and Face Reality lists. ` +
      `You can save products to look back at later, and search the ingredient list in ` +
      `the Ingredients tab.\n\n` +
      `Ingredient Scanner is for information only and isn't a substitute for advice ` +
      `from a skincare professional.\n\n` +
      `The Ingredient Scanner team`,
  });
}

// Sends one plain-text email from the app's address
async function send({ to, subject, text }) {
  try {
    await getTransporter().sendMail({
      from: `"Ingredient Scanner" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
  } catch (err) {
    // The details (e.g. wrong app password) are for the developer, not the user
    console.error('Could not send email:', err.message);
    throw new HttpError(502, "Couldn't send the email right now. Please try again.");
  }
}

module.exports = {
  assertConfigured,
  sendPasswordResetCode,
  sendVerificationCode,
  sendWelcomeEmail,
};
