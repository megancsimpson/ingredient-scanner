// Must be set before the app loads: the login setup reads it straight away
process.env.JWT_SECRET = 'test-secret';

const express = require('express');
const {
  apiLimit,
  loginLimit,
  registerLimit,
  emailLimit,
  codeLimit,
  photoLimit,
} = require('../middleware/rateLimits');
const { app, routers } = require('../app');

// A tiny server with the limits in front of fake routes, so real HTTP
// requests can be sent to it. It listens on a free port chosen by the system.
let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.use(express.json());

  // Fake login: succeeds only for the password "right"
  app.post('/login', loginLimit, (req, res) => {
    if (req.body.password === 'right') return res.json({ ok: true });
    res.status(401).json({ error: 'Incorrect email or password.' });
  });

  // Fake photo scan: the "user" header stands in for the logged-in user
  // that requireAuth would set
  app.post(
    '/ocr',
    (req, res, next) => {
      req.user = { id: req.get('user') };
      next();
    },
    photoLimit,
    (req, res) => res.json({ text: 'Water' })
  );

  // Fake versions of the other limited routes, which always succeed. The
  // two emailed-code routes share one limit, as they do in routes/auth.js.
  const ok = (req, res) => res.json({ ok: true });
  app.post('/register', registerLimit, ok);
  app.post('/forgot-password', emailLimit, ok);
  app.post('/send-verification', emailLimit, ok);
  app.post('/verify-email', codeLimit, ok);
  app.post('/reset-password', codeLimit, ok);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const post = (path, body, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

// Each test uses its own email or user, since the counts are kept between tests

describe('loginLimit', () => {
  test('blocks the 11th wrong password in 15 minutes with a 429 and a message', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await post('/login', { email: 'sam@example.com', password: 'wrong' });
      expect(res.status).toBe(401);
    }
    const blocked = await post('/login', { email: 'sam@example.com', password: 'wrong' });
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({
      error: 'Too many login attempts. Please wait 15 minutes and try again.',
    });
  });

  test('counts the email without caring about capitals or spaces', async () => {
    for (let i = 0; i < 10; i += 1) {
      await post('/login', { email: 'alex@example.com', password: 'wrong' });
    }
    const blocked = await post('/login', { email: '  ALEX@example.com ', password: 'wrong' });
    expect(blocked.status).toBe(429);
  });

  test("doesn't block a different email from the same address", async () => {
    for (let i = 0; i < 10; i += 1) {
      await post('/login', { email: 'jo@example.com', password: 'wrong' });
    }
    const other = await post('/login', { email: 'kim@example.com', password: 'wrong' });
    expect(other.status).toBe(401);
  });

  test("doesn't count successful logins", async () => {
    for (let i = 0; i < 15; i += 1) {
      const res = await post('/login', { email: 'lee@example.com', password: 'right' });
      expect(res.status).toBe(200);
    }
  });
});

describe('photoLimit', () => {
  test('allows 50 photos per user per day, then blocks with a message', async () => {
    for (let i = 0; i < 50; i += 1) {
      const res = await post('/ocr', {}, { user: 'user-a' });
      expect(res.status).toBe(200);
    }
    const blocked = await post('/ocr', {}, { user: 'user-a' });
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toMatch(/today's limit for photo scans/);
  });

  test("counts each user separately, so one user's scans don't block another", async () => {
    for (let i = 0; i < 50; i += 1) {
      await post('/ocr', {}, { user: 'user-b' });
    }
    const other = await post('/ocr', {}, { user: 'user-c' });
    expect(other.status).toBe(200);
  });
});

// These limits count per IP address, and every test request comes from the
// same one, so each limit gets one test that uses up its whole allowance

describe('registerLimit', () => {
  test('allows 20 new accounts an hour, then blocks with a message', async () => {
    for (let i = 0; i < 20; i += 1) {
      expect((await post('/register', {})).status).toBe(200);
    }
    const blocked = await post('/register', {});
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'Too many accounts created. Please try again later.' });
  });
});

describe('emailLimit', () => {
  test('allows 10 emailed codes an hour, counting forgot password and verification together', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await post('/forgot-password', {})).status).toBe(200);
      expect((await post('/send-verification', {})).status).toBe(200);
    }
    const blocked = await post('/forgot-password', {});
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'Too many emails requested. Please try again later.' });
  });
});

describe('codeLimit', () => {
  test('allows 20 code entries in 15 minutes, counting both kinds of code together', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await post('/verify-email', {})).status).toBe(200);
      expect((await post('/reset-password', {})).status).toBe(200);
    }
    const blocked = await post('/reset-password', {});
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'Too many attempts. Please wait 15 minutes and try again.' });
  });
});

/**
 * The tests above check what each limit does; these check the real routes
 * use them. Each route in a router has a list of handlers it runs in order
 * (route.stack), and the limit must be one of them.
 */
describe('limits on the real routes', () => {
  /** The handlers that run for "METHOD path" in a router. */
  function handlersFor(router, method, path) {
    const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method.toLowerCase()]);
    expect(layer).toBeDefined();
    return layer.route.stack.map((l) => l.handle);
  }

  test.each([
    ['POST', '/register', registerLimit],
    ['POST', '/login', loginLimit],
    ['POST', '/forgot-password', emailLimit],
    ['POST', '/send-verification', emailLimit],
    ['POST', '/verify-email', codeLimit],
    ['POST', '/reset-password', codeLimit],
  ])('%s /api/auth%s has its limit', (method, path, limit) => {
    expect(handlersFor(routers['/api/auth'], method, path)).toContain(limit);
  });

  test('POST /api/ocr has the photo limit, after the login check', () => {
    const handlers = handlersFor(routers['/api/ocr'], 'POST', '/');
    // photoLimit counts per user, so it needs requireAuth to have run first
    const { requireAuth } = require('../middleware/auth');
    expect(handlers.indexOf(requireAuth)).toBeGreaterThanOrEqual(0);
    expect(handlers.indexOf(photoLimit)).toBeGreaterThan(handlers.indexOf(requireAuth));
  });

  test('every API request goes through the overall limit, except the health check', () => {
    const handlers = app.router.stack.map((l) => (l.route ? `route ${l.route.path}` : l.handle));
    const limitAt = handlers.indexOf(apiLimit);
    expect(limitAt).toBeGreaterThanOrEqual(0);
    // Render calls the health check every few seconds, so it comes first
    expect(handlers.indexOf('route /api/health')).toBeLessThan(limitAt);
    // Every group of API routes comes after the limit
    for (const router of Object.values(routers)) {
      expect(handlers.indexOf(router)).toBeGreaterThan(limitAt);
    }
  });
});
