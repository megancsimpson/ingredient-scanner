// Must be set before the app loads: the login setup reads it straight away
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const SavedProduct = require('../models/SavedProduct');
const { app, routers } = require('../app');

// No database in these tests. Anything that reaches it fails straight away
// instead of waiting 10 seconds for a connection that never comes.
mongoose.set('bufferCommands', false);

/**
 * Who can use each route. Every route the app has must be in one of these
 * lists or in neither (then it needs a login with a verified email). The
 * tests below find the routes themselves, so a new route is checked even
 * if nobody remembers to add it here.
 */
// Anyone, without logging in
const PUBLIC = new Set([
  'GET /api/health',
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
]);
// Logged in, even before verifying the email (requireLogin)
const LOGIN_ONLY = new Set([
  'GET /api/auth/me',
  'DELETE /api/auth/me',
  'POST /api/auth/send-verification',
  'POST /api/auth/verify-email',
]);

const EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

/** Every route the app has, as "METHOD /path", found from the app itself. */
function allRoutes() {
  const found = [];
  const add = (prefix, layer) => {
    for (const method of Object.keys(layer.route.methods)) {
      found.push(`${method.toUpperCase()} ${prefix}${layer.route.path === '/' ? '' : layer.route.path}`);
    }
  };
  for (const layer of app.router.stack) {
    if (layer.route) add('', layer); // attached to the app directly, e.g. /api/health
  }
  for (const [prefix, router] of Object.entries(routers)) {
    for (const layer of router.stack) if (layer.route) add(prefix, layer);
  }
  return found;
}

// Server for the requests, on a free port
let server;
let baseUrl;
beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
// The email service logs when email isn't set up, which it isn't in tests
beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

/** Sends "METHOD /path" with an optional token. :id becomes a valid ID. */
async function send(route, token) {
  const [method, path] = route.split(' ');
  const url = baseUrl + path.replace(':id', new mongoose.Types.ObjectId().toString());
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(method !== 'GET' && { body: '{}' }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const tokenFor = (user, options) => jwt.sign({ sub: user.id }, 'test-secret', options);

/** A user the login check will "find" for a valid token. */
function fakeUser(fields = {}) {
  const user = new User({ name: 'Sam', email: 'sam@example.com', passwordHash: 'x', ...fields });
  jest.spyOn(User, 'findById').mockResolvedValue(user);
  return user;
}

describe('route list', () => {
  test('every group of routes attached to the app is in the routers list', () => {
    // Otherwise a group could be added without these tests checking it
    const attached = app.router.stack
      .filter((layer) => layer.handle?.stack) // groups of routes, not single handlers
      .map((layer) => layer.handle);
    for (const router of attached) {
      expect(Object.values(routers)).toContain(router);
    }
  });

  test('finds the routes (so the checks below aren’t checking nothing)', () => {
    const routes = allRoutes();
    expect(routes).toContain('GET /api/products/:id');
    expect(routes).toContain('POST /api/ocr');
    // 1 health check, 8 account, 1 analyze, 5 product, 2 ingredient, 1 photo
    expect(routes.length).toBeGreaterThanOrEqual(18);
  });
});

describe('without a login', () => {
  const protectedRoutes = allRoutes().filter((route) => !PUBLIC.has(route));

  test.each(protectedRoutes)('%s refuses with 401', async (route) => {
    const res = await send(route);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: EXPIRED_MESSAGE });
  });

  test.each([...PUBLIC])('%s is open to everyone', async (route) => {
    // These answer with their own errors for an empty request, but never
    // the login check's
    const res = await send(route);
    expect(res.body?.error).not.toBe(EXPIRED_MESSAGE);
  });
});

describe('logged in with an unverified email', () => {
  const verifiedOnly = allRoutes().filter((route) => !PUBLIC.has(route) && !LOGIN_ONLY.has(route));

  test.each(verifiedOnly)('%s refuses with 403', async (route) => {
    const token = tokenFor(fakeUser({ emailVerified: false }));
    const res = await send(route, token);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Please verify your email first.' });
  });

  test.each([...LOGIN_ONLY])('%s is allowed, so the user can finish signing up', async (route) => {
    const token = tokenFor(fakeUser({ emailVerified: false }));
    // Deleting the account would reach the database; fake it
    jest.spyOn(SavedProduct, 'deleteMany').mockResolvedValue({});
    jest.spyOn(User, 'deleteOne').mockResolvedValue({});

    const res = await send(route, token);
    expect([401, 403]).not.toContain(res.status);
  });
});

describe('login tokens', () => {
  test('a valid token for an existing user works', async () => {
    const user = fakeUser({ emailVerified: true });
    const res = await send('GET /api/auth/me', tokenFor(user));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('sam@example.com');
  });

  test('a token signed with a different secret is refused', async () => {
    const user = fakeUser({ emailVerified: true });
    const forged = jwt.sign({ sub: user.id }, 'not-the-secret');
    expect((await send('GET /api/auth/me', forged)).status).toBe(401);
  });

  test('an expired token is refused', async () => {
    const user = fakeUser({ emailVerified: true });
    const expired = tokenFor(user, { expiresIn: -10 });
    expect((await send('GET /api/auth/me', expired)).status).toBe(401);
  });

  test('a token for a deleted account is refused', async () => {
    const token = tokenFor(new User({ name: 'Gone', email: 'gone@example.com', passwordHash: 'x' }));
    jest.spyOn(User, 'findById').mockResolvedValue(null);
    expect((await send('GET /api/auth/me', token)).status).toBe(401);
  });

  test('a token from before a password reset is refused (other devices are logged out)', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 60;
    const user = fakeUser({ emailVerified: true, passwordChangedAt: new Date() });
    const oldToken = jwt.sign({ sub: user.id, iat: issuedAt }, 'test-secret');
    expect((await send('GET /api/auth/me', oldToken)).status).toBe(401);
  });

  test('a token from right after a password reset works', async () => {
    // The reset logs the user in with a new token in the same second
    const user = fakeUser({ emailVerified: true, passwordChangedAt: new Date() });
    expect((await send('GET /api/auth/me', tokenFor(user))).status).toBe(200);
  });

  test('a token that isn’t sent as "Bearer <token>" is refused', async () => {
    const user = fakeUser({ emailVerified: true });
    const res = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: tokenFor(user) } });
    expect(res.status).toBe(401);
  });
});
