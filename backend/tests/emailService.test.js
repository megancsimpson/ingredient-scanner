// Replace nodemailer with a fake ("mock"), so these tests never send real
// email and can check what would have been sent
jest.mock('nodemailer');

const nodemailer = require('nodemailer');
const {
  assertConfigured,
  sendPasswordResetCode,
  sendVerificationCode,
  sendWelcomeEmail,
} = require('../services/emailService');

// The fake Gmail connection. emailService creates its connection once and
// keeps it, so every test shares this one sendMail.
const sendMail = jest.fn();
nodemailer.createTransport.mockReturnValue({ sendMail });

/** The one email sent in this test: { from, to, subject, text }. */
function sentEmail() {
  expect(sendMail).toHaveBeenCalledTimes(1);
  return sendMail.mock.calls[0][0];
}

beforeEach(() => {
  sendMail.mockReset();
  sendMail.mockResolvedValue({});
  process.env.EMAIL_USER = 'app@example.com';
  process.env.EMAIL_APP_PASSWORD = 'app-password';
  // The service logs problems for the developer; keep test output clean
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_APP_PASSWORD;
});

describe('when email is set up', () => {
  test('the password reset email has the code and how long it works', async () => {
    await sendPasswordResetCode('sam@example.com', '123456', 15);

    const email = sentEmail();
    expect(email.to).toBe('sam@example.com');
    expect(email.from).toBe('"Ingredient Scanner" <app@example.com>');
    expect(email.subject).toContain('123456');
    expect(email.text).toContain('123456');
    expect(email.text).toContain('within 15 minutes');
  });

  test('the verification email has the name, the code and how long it works', async () => {
    await sendVerificationCode('sam@example.com', 'Sam', '654321', 15);

    const email = sentEmail();
    expect(email.to).toBe('sam@example.com');
    expect(email.subject).toContain('654321');
    expect(email.text).toContain('Hi Sam');
    expect(email.text).toContain('654321');
    expect(email.text).toContain('within 15 minutes');
  });

  test('the welcome email greets the user and has the "information only" note', async () => {
    await sendWelcomeEmail('sam@example.com', 'Sam');

    const email = sentEmail();
    expect(email.to).toBe('sam@example.com');
    expect(email.subject).toBe('Welcome to Ingredient Scanner');
    expect(email.text).toContain('Hi Sam');
    expect(email.text).toContain("isn't a substitute for advice from a skincare professional");
  });

  test("assertConfigured doesn't complain", () => {
    expect(() => assertConfigured()).not.toThrow();
  });

  test.each([
    ['password reset', () => sendPasswordResetCode('sam@example.com', '123456', 15)],
    ['verification', () => sendVerificationCode('sam@example.com', 'Sam', '123456', 15)],
    ['welcome', () => sendWelcomeEmail('sam@example.com', 'Sam')],
  ])('answers 502 when Gmail fails to send the %s email, without passing on the details', async (_, send) => {
    sendMail.mockRejectedValue(new Error('Invalid login: 535 Username and Password not accepted'));

    const error = await send().catch((err) => err);

    expect(error).toMatchObject({ status: 502, message: "Couldn't send the email right now. Please try again." });
    // The details are logged for the developer instead
    expect(console.error).toHaveBeenCalledWith(
      'Could not send email:',
      'Invalid login: 535 Username and Password not accepted'
    );
  });
});

describe("when email isn't set up", () => {
  const NOT_SET_UP = { status: 503, message: "Password reset isn't available right now. Please try again later." };

  test.each(['EMAIL_USER', 'EMAIL_APP_PASSWORD'])('assertConfigured answers 503 when %s is missing', (variable) => {
    delete process.env[variable];
    expect(() => assertConfigured()).toThrow(expect.objectContaining(NOT_SET_UP));
  });

  test('the password reset email answers 503 and sends nothing', async () => {
    delete process.env.EMAIL_APP_PASSWORD;

    await expect(sendPasswordResetCode('sam@example.com', '123456', 15)).rejects.toMatchObject(NOT_SET_UP);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('the verification email answers 503 and sends nothing', async () => {
    delete process.env.EMAIL_APP_PASSWORD;

    await expect(sendVerificationCode('sam@example.com', 'Sam', '123456', 15)).rejects.toMatchObject(NOT_SET_UP);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('the welcome email is skipped quietly (no error)', async () => {
    delete process.env.EMAIL_APP_PASSWORD;

    await expect(sendWelcomeEmail('sam@example.com', 'Sam')).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
