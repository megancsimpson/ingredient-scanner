const express = require('express');
const { loginLimit, photoLimit } = require('../middleware/rateLimits');

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
