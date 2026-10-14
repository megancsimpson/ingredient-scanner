const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Replace the database model and email sending with fakes ("mocks"), so
// these tests run without MongoDB or Gmail and can check what was called
jest.mock('../models/User');
jest.mock('../services/emailService');
jest.mock('../services/productService');

const User = require('../models/User');
const emailService = require('../services/emailService');
const { requestPasswordReset, resetPassword } = require('../services/authService');

process.env.JWT_SECRET = 'test-secret';

// Mongoose queries are chained (User.findOne(...).select(...)); this fakes
// that chain, ending in `result`
function query(result) {
  return { select: jest.fn().mockResolvedValue(result) };
}

// A fake user document with the fields the service uses
function fakeUser(fields = {}) {
  return { id: 'user1', email: 'sam@example.com', save: jest.fn(), ...fields };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('requestPasswordReset', () => {
  test('emails a 6-digit code and stores only its hash', async () => {
    const user = fakeUser();
    User.findOne.mockReturnValue(query(user));

    await requestPasswordReset('  Sam@Example.com ');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'sam@example.com' });
    const [to, code] = emailService.sendPasswordResetCode.mock.calls[0];
    expect(to).toBe('sam@example.com');
    expect(code).toMatch(/^\d{6}$/);

    expect(user.passwordReset.codeHash).not.toBe(code);
    expect(await bcrypt.compare(code, user.passwordReset.codeHash)).toBe(true);
    expect(user.passwordReset.attempts).toBe(0);
    expect(user.save).toHaveBeenCalled();
  });

  test('does nothing, without an error, for an unknown email', async () => {
    User.findOne.mockReturnValue(query(null));

    await expect(requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    expect(emailService.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  test("doesn't send another code within a minute of the last one", async () => {
    const user = fakeUser({ passwordReset: { sentAt: new Date(Date.now() - 30 * 1000) } });
    User.findOne.mockReturnValue(query(user));

    await requestPasswordReset('sam@example.com');

    expect(emailService.sendPasswordResetCode).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });

  test('sends a new code once a minute has passed', async () => {
    const user = fakeUser({ passwordReset: { sentAt: new Date(Date.now() - 61 * 1000) } });
    User.findOne.mockReturnValue(query(user));

    await requestPasswordReset('sam@example.com');

    expect(emailService.sendPasswordResetCode).toHaveBeenCalled();
  });

  test("checks email is set up before looking up the account", async () => {
    emailService.assertConfigured.mockImplementation(() => {
      throw new Error('not set up');
    });

    await expect(requestPasswordReset('sam@example.com')).rejects.toThrow('not set up');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("doesn't save the code if the email fails to send", async () => {
    const user = fakeUser();
    User.findOne.mockReturnValue(query(user));
    emailService.sendPasswordResetCode.mockRejectedValue(new Error('send failed'));

    await expect(requestPasswordReset('sam@example.com')).rejects.toThrow('send failed');
    expect(user.save).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  const CODE = '012345';

  async function userWithCode() {
    return fakeUser({
      passwordReset: { codeHash: await bcrypt.hash(CODE, 4), sentAt: new Date(), attempts: 0 },
    });
  }

  test('sets the new password, uses up the code and logs the user in', async () => {
    const user = await userWithCode();
    User.findOneAndUpdate.mockReturnValue(query(user));

    const result = await resetPassword({
      email: 'sam@example.com',
      code: ` ${CODE} `,
      password: 'new-password',
    });

    expect(await bcrypt.compare('new-password', user.passwordHash)).toBe(true);
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(user.passwordReset).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
    expect(jwt.verify(result.token, 'test-secret').sub).toBe('user1');
    expect(result.user).toBe(user);
  });

  test('only accepts a code that is unexpired and under the guess limit, and counts the guess', async () => {
    User.findOneAndUpdate.mockReturnValue(query(await userWithCode()));
    const before = Date.now();

    await resetPassword({ email: 'Sam@example.com', code: CODE, password: 'new-password' });

    const [filter, update] = User.findOneAndUpdate.mock.calls[0];
    expect(filter.email).toBe('sam@example.com');
    expect(filter['passwordReset.attempts']).toEqual({ $lt: 5 });
    // Codes older than 15 minutes don't match
    const cutoff = filter['passwordReset.sentAt'].$gt.getTime();
    expect(before - cutoff).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
    expect(before - cutoff).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    expect(update).toEqual({ $inc: { 'passwordReset.attempts': 1 } });
  });

  test('rejects a wrong code without changing the password', async () => {
    const user = await userWithCode();
    User.findOneAndUpdate.mockReturnValue(query(user));

    await expect(
      resetPassword({ email: 'sam@example.com', code: '999999', password: 'new-password' })
    ).rejects.toMatchObject({ status: 400 });
    expect(user.save).not.toHaveBeenCalled();
  });

  test('rejects when there is no valid code (expired, used up or unknown email)', async () => {
    User.findOneAndUpdate.mockReturnValue(query(null));

    await expect(
      resetPassword({ email: 'sam@example.com', code: CODE, password: 'new-password' })
    ).rejects.toMatchObject({ status: 400 });
  });

  test.each([undefined, '', '12345', '1234567', 'abcdef', 123456])(
    'rejects a code that is not 6 digits (%p) without a database lookup',
    async (code) => {
      await expect(
        resetPassword({ email: 'sam@example.com', code, password: 'new-password' })
      ).rejects.toMatchObject({ status: 400 });
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    }
  );

  test('checks the new password before the code, so a short one uses no guess', async () => {
    await expect(
      resetPassword({ email: 'sam@example.com', code: CODE, password: 'short' })
    ).rejects.toThrow('at least 8 characters');
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
