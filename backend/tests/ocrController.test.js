// Must be set before the app loads: the login setup reads it straight away
process.env.JWT_SECRET = 'test-secret';

// Replace the Google Vision call with a fake ("mock"), so these tests never
// send photos to Google and can choose what it "reads". The real
// extractText is tested in ocrService.test.js.
jest.mock('../services/ocrService');

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { extractText } = require('../services/ocrService');
const HttpError = require('../utils/httpError');
const { app } = require('../app');

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

// Each test logs in as a new verified user the login check will "find".
// A new user each time means the daily photo limit never gets in the way.
let token;
beforeEach(() => {
  const user = new User({ name: 'Sam', email: 'sam@example.com', passwordHash: 'x', emailVerified: true });
  jest.spyOn(User, 'findById').mockResolvedValue(user);
  token = jwt.sign({ sub: user.id }, 'test-secret');
});
afterEach(() => {
  jest.restoreAllMocks();
  extractText.mockReset();
});

/** Sends POST /api/ocr with `body` as JSON. */
async function ocr(body) {
  const res = await fetch(`${baseUrl}/api/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/ocr', () => {
  test('returns just the ingredient list when the photo has an "Ingredients" heading', async () => {
    extractText.mockResolvedValue('Acme Face Cream\n\nIngredients: Water, Coconut Oil.\n\nMade in Canada');

    const res = await ocr({ image: 'abc123' });

    expect(res.status).toBe(200);
    // The brand and "Made in" line are left out, and so is the period that
    // ends the list
    expect(res.body).toEqual({ text: 'Water, Coconut Oil', ingredientsFound: true });
  });

  test('returns all the text when there is no "Ingredients" heading', async () => {
    extractText.mockResolvedValue('Water, Coconut Oil, Glycerin');

    const res = await ocr({ image: 'abc123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ text: 'Water, Coconut Oil, Glycerin', ingredientsFound: false });
  });

  test('sends the photo to Google without a "data:image/...;base64," prefix', async () => {
    extractText.mockResolvedValue('Water');

    await ocr({ image: 'data:image/jpeg;base64,abc123' });

    expect(extractText).toHaveBeenCalledWith('abc123');
  });

  test.each([
    ['missing', {}],
    ['empty', { image: '' }],
    ['not text', { image: 12345 }],
    ['an object', { image: { $ne: '' } }],
  ])('refuses a photo that is %s with 400', async (_, body) => {
    const res = await ocr(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Please include a photo.' });
    expect(extractText).not.toHaveBeenCalled();
  });

  test('refuses a photo over 6 MB (as base64) with 400, without sending it to Google', async () => {
    const res = await ocr({ image: 'a'.repeat(6 * 1024 * 1024 + 1) });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'That photo is too large. Please try again.' });
    expect(extractText).not.toHaveBeenCalled();
  });

  test('refuses a request body over 8 MB with 413', async () => {
    const res = await ocr({ image: 'a'.repeat(9 * 1024 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Request is too large.' });
  });

  test.each([
    ['none', ''],
    ['only spaces and line breaks', '  \n\n '],
  ])('answers 422 when Google finds no text (%s)', async (_, text) => {
    extractText.mockResolvedValue(text);

    const res = await ocr({ image: 'abc123' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Couldn't find any text in that photo/);
  });

  test("passes on Google's errors with their status and message", async () => {
    // e.g. photo scanning not set up (extractText's own cases are tested in
    // ocrService.test.js)
    extractText.mockRejectedValue(
      new HttpError(503, 'Photo scanning is not available right now. Try pasting the list instead.')
    );

    const res = await ocr({ image: 'abc123' });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: 'Photo scanning is not available right now. Try pasting the list instead.',
    });
  });
});
