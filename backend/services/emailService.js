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

  try {
    await getTransporter().sendMail({
      from: `"Ingredient Scanner" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your Ingredient Scanner code: ${code}`,
      text:
        `Your code to reset your Ingredient Scanner password is:\n\n` +
        `${code}\n\n` +
        `Enter it in the app within ${minutesValid} minutes.\n\n` +
        `If you didn't ask to reset your password, you can ignore this email; ` +
        `your password hasn't changed.`,
    });
  } catch (err) {
    // The details (e.g. wrong app password) are for the developer, not the user
    console.error('Could not send email:', err.message);
    throw new HttpError(502, "Couldn't send the email right now. Please try again.");
  }
}

module.exports = { assertConfigured, sendPasswordResetCode };
