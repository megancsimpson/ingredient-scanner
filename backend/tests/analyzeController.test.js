// Must be set before the app loads: the login setup reads it straight away
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Ingredient = require('../models/Ingredient');
const { app } = require('../app');

// No database in these tests. Anything that reaches it fails straight away
// instead of waiting 10 seconds for a connection that never comes.
mongoose.set('bufferCommands', false);

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

// Each test logs in as a verified user the login check will "find", and
// the ingredient list comes from a fake database with two entries
let token;
beforeEach(() => {
  const user = new User({ name: 'Sam', email: 'sam@example.com', passwordHash: 'x', emailVerified: true });
  jest.spyOn(User, 'findById').mockResolvedValue(user);
  token = jwt.sign({ sub: user.id }, 'test-secret');

  // analysisService calls Ingredient.find(...).lean(); this fakes that chain
  jest.spyOn(Ingredient, 'find').mockReturnValue({
    lean: jest.fn().mockResolvedValue([
      { name: 'Coconut Oil', normalized: 'coconut oil', aliases: [], sources: ['Face Reality'] },
      { name: 'Isopropyl Myristate', normalized: 'isopropyl myristate', aliases: [], sources: ['Acne Clinic NYC'] },
    ]),
  });
});
afterEach(() => jest.restoreAllMocks());

/** Sends POST /api/analyze with `body` as JSON. */
async function analyze(body) {
  const res = await fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/analyze', () => {
  test('returns the parsed list and the flagged ingredients', async () => {
    const res = await analyze({ text: 'Water, Coconut Oil, Glycerin' });

    expect(res.status).toBe(200);
    expect(res.body.ingredients.map((i) => i.name)).toEqual(['Water', 'Coconut Oil', 'Glycerin']);
    expect(res.body.flagged).toHaveLength(1);
    expect(res.body.flagged[0]).toMatchObject({ name: 'Coconut Oil', sources: ['Face Reality'] });
    expect(res.body.looksLikeIngredientList).toBe(true);
  });

  test.each([
    ['missing', {}],
    ['empty', { text: '' }],
    ['only spaces and line breaks', { text: '   \n  ' }],
    ['not text', { text: ['Water', 'Coconut Oil'] }],
    ['an object (could change a database query)', { text: { $ne: '' } }],
  ])('refuses text that is %s with 400', async (_, body) => {
    const res = await analyze(body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Please enter an ingredient list.' });
  });

  test('refuses text over 10,000 characters with 400', async () => {
    const res = await analyze({ text: 'a'.repeat(10001) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Ingredient list is too long (max 10000 characters).' });
    // Refused before the database is asked for anything
    expect(Ingredient.find).not.toHaveBeenCalled();
  });

  test('accepts text of exactly 10,000 characters', async () => {
    // 1,428 × "Water, " is 9,996 characters, plus "Aqua" makes 10,000
    const text = `${'Water, '.repeat(1428)}Aqua`;
    expect(text).toHaveLength(10000);

    const res = await analyze({ text });
    expect(res.status).toBe(200);
  });

  test.each([
    ['only a heading', 'Ingredients:'],
    ['only a footnote', '*Certified Organic'],
    ['only commas', ' , , , '],
    ['only symbols', '!!!'],
  ])('refuses text with no ingredients (%s) with 400', async (_, text) => {
    const res = await analyze({ text });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Couldn't find any ingredients in that text." });
  });
});
