// Must be set before the app loads: the login setup reads it straight away
process.env.JWT_SECRET = 'test-secret';

const mongoose = require('mongoose');
const errorHandler = require('../middleware/errorHandler');
const HttpError = require('../utils/httpError');
const { app } = require('../app');

// Runs the error handler on an error and returns the response it sent
function handle(err) {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  errorHandler(err, {}, res, () => {});
  return res;
}

// Unexpected errors are logged on the server; keep the test output clean
// and let tests check what was logged
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('errors thrown on purpose (HttpError)', () => {
  test('sends the status and the message meant for the user', () => {
    const res = handle(new HttpError(404, 'Product not found.'));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found.' });
  });

  test('includes extra details for the app', () => {
    const duplicate = { id: 'abc', productName: 'Night Cream' };
    const res = handle(new HttpError(409, 'Already saved.', { duplicate }));
    expect(res.body).toEqual({ error: 'Already saved.', duplicate });
  });

  test('isn’t logged, since it isn’t a problem with the server', () => {
    handle(new HttpError(400, 'Please enter an ingredient list.'));
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('database errors', () => {
  test('a failed schema rule sends its message as a 400', async () => {
    // A real validation error, from a product with no name
    const SavedProduct = require('../models/SavedProduct');
    const err = await new SavedProduct({ rawText: 'Water' }).validate().catch((error) => error);
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    const res = handle(err);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Product name is required.');
  });

  test('sends only the first problem when there are several', () => {
    const err = new mongoose.Error.ValidationError();
    err.addError('productName', new mongoose.Error.ValidatorError({ message: 'First problem.' }));
    err.addError('brand', new mongoose.Error.ValidatorError({ message: 'Second problem.' }));
    expect(handle(err).body).toEqual({ error: 'First problem.' });
  });

  test('a duplicate email (two sign-ups at the same moment) is a 409', () => {
    const err = Object.assign(new Error('E11000 duplicate key error collection: users index: email_1'), {
      code: 11000,
    });
    const res = handle(err);
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: 'An account with this email already exists.' });
  });
});

describe('unexpected errors', () => {
  // A made-up error that contains the kind of detail that must never reach
  // the app: a connection string with a password, and a file path
  const secretError = () =>
    new Error('connect failed: mongodb+srv://admin:hunter2@cluster0.example.net at /app/services/x.js');

  test('send a generic 500 message', () => {
    const res = handle(secretError());
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong. Please try again.' });
  });

  test('never include the error’s own message or stack trace', () => {
    const body = JSON.stringify(handle(secretError()).body);
    expect(body).not.toMatch(/hunter2|mongodb|services|stack|at \//);
  });

  test('are logged on the server, where the developer can see the details', () => {
    const err = secretError();
    handle(err);
    expect(console.error).toHaveBeenCalledWith(err);
  });

  test('keep a status set by a library, but still hide the message', () => {
    const err = Object.assign(new Error('internal library detail'), { status: 415 });
    const res = handle(err);
    expect(res.statusCode).toBe(415);
    expect(res.body).toEqual({ error: 'Something went wrong. Please try again.' });
  });
});

// The same checks through the real app: requests the JSON parser rejects
// before any route runs must still get the usual { error } shape
describe('through the app', () => {
  let server;
  let baseUrl;
  beforeAll(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  const postRaw = (body) =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

  test('broken JSON gets a 400 with a clear message', async () => {
    const res = await postRaw('{"email": "sam@example.com", ');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request body must be valid JSON.' });
  });

  test('a body over 100 KB gets a 413', async () => {
    const res = await postRaw(JSON.stringify({ email: 'a'.repeat(110 * 1024) }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'Request is too large.' });
  });

  // (Unknown addresses under /api/products get the login check's 401 first,
  // so they don't reveal anything to someone who isn't logged in)
  test.each([['/api/nothing-here'], ['/'], ['/api/auth/nothing-here']])(
    'an address that doesn’t exist (%s) gets a 404 in the usual shape, not an HTML page',
    async (path) => {
      const res = await fetch(`${baseUrl}${path}`);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
      expect(await res.json()).toEqual({ error: 'Not found.' });
    }
  );
});
