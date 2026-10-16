// Must be set before the app loads: the login setup reads it straight away
process.env.JWT_SECRET = 'test-secret';

// Replace the services with fakes ("mocks"). Their rules are tested in
// their own test files; these tests check the controllers in between:
// what they pass to the services and what they send back. In particular,
// the user always comes from the login token, never from the request.
jest.mock('../services/productService');
jest.mock('../services/ingredientService');
jest.mock('../services/authService');

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const productService = require('../services/productService');
const ingredientService = require('../services/ingredientService');
const authService = require('../services/authService');
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

// Each test is logged in as Sam, a verified user the login check will "find"
let sam;
let token;
beforeEach(() => {
  jest.resetAllMocks();
  sam = new User({ name: 'Sam', email: 'sam@example.com', passwordHash: 'x', emailVerified: true });
  jest.spyOn(User, 'findById').mockResolvedValue(sam);
  token = jwt.sign({ sub: sam.id }, 'test-secret');
});
afterEach(() => jest.restoreAllMocks());

/** Sends "METHOD path" as Sam, with an optional JSON body. */
async function send(method, path, body) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, text, body: text ? JSON.parse(text) : null };
}

// Someone else's user ID, sent in a request to try to act as them
const SOMEONE_ELSE = new mongoose.Types.ObjectId().toString();
const PRODUCT_ID = new mongoose.Types.ObjectId().toString();

describe('saved products', () => {
  test('GET /api/products lists the logged-in user\'s products', async () => {
    productService.listProducts.mockResolvedValue([{ id: '1', productName: 'Night Cream' }]);

    const res = await send('GET', '/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [{ id: '1', productName: 'Night Cream' }] });
    expect(productService.listProducts).toHaveBeenCalledWith(sam._id);
  });

  test('GET /api/products/:id asks for that product, owned by the logged-in user', async () => {
    productService.getProduct.mockResolvedValue({ id: PRODUCT_ID, productName: 'Night Cream' });

    const res = await send('GET', `/api/products/${PRODUCT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ product: { id: PRODUCT_ID, productName: 'Night Cream' } });
    expect(productService.getProduct).toHaveBeenCalledWith(sam._id, PRODUCT_ID);
  });

  test('POST /api/products saves for the logged-in user (201), ignoring a "user" in the body', async () => {
    productService.createProduct.mockResolvedValue({ id: PRODUCT_ID, productName: 'Night Cream' });

    const res = await send('POST', '/api/products', {
      productName: 'Night Cream',
      brand: 'Acme',
      category: 'moisturizer',
      rawText: 'Water, Coconut Oil',
      source: 'photo',
      onDuplicate: 'keep',
      // Trying to save the product to someone else's account, and to send
      // results instead of letting the server analyze the text
      user: SOMEONE_ELSE,
      flagged: [],
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ product: { id: PRODUCT_ID, productName: 'Night Cream' } });
    // Only the allowed fields reach the service, and the user is Sam
    expect(productService.createProduct).toHaveBeenCalledWith(sam._id, {
      productName: 'Night Cream',
      brand: 'Acme',
      category: 'moisturizer',
      rawText: 'Water, Coconut Oil',
      source: 'photo',
      onDuplicate: 'keep',
    });
  });

  test('PATCH /api/products/:id changes only the name, brand and category, for the logged-in user', async () => {
    productService.updateProduct.mockResolvedValue({ id: PRODUCT_ID, productName: 'Day Cream' });

    const res = await send('PATCH', `/api/products/${PRODUCT_ID}`, {
      productName: 'Day Cream',
      category: null,
      // None of these can be changed this way
      user: SOMEONE_ELSE,
      rawText: 'Water',
      flagged: [],
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ product: { id: PRODUCT_ID, productName: 'Day Cream' } });
    expect(productService.updateProduct).toHaveBeenCalledWith(sam._id, PRODUCT_ID, {
      productName: 'Day Cream',
      brand: undefined,
      category: null,
      onDuplicate: undefined,
    });
  });

  test('DELETE /api/products/:id deletes it for the logged-in user, answering 204 with no body', async () => {
    productService.deleteProduct.mockResolvedValue();

    const res = await send('DELETE', `/api/products/${PRODUCT_ID}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(productService.deleteProduct).toHaveBeenCalledWith(sam._id, PRODUCT_ID);
  });
});

describe('ingredients', () => {
  test('GET /api/ingredients passes on the search', async () => {
    ingredientService.searchIngredients.mockResolvedValue([{ id: '1', name: 'Coconut Oil' }]);

    const res = await send('GET', '/api/ingredients?search=coconut%20%26%20shea');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ingredients: [{ id: '1', name: 'Coconut Oil' }] });
    expect(ingredientService.searchIngredients).toHaveBeenCalledWith('coconut & shea');
  });

  test('GET /api/ingredients/:id asks for that ingredient', async () => {
    ingredientService.getIngredient.mockResolvedValue({ id: 'abc', name: 'Coconut Oil' });

    const res = await send('GET', '/api/ingredients/abc');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ingredient: { id: 'abc', name: 'Coconut Oil' } });
    expect(ingredientService.getIngredient).toHaveBeenCalledWith('abc');
  });
});

describe('accounts', () => {
  test('POST /api/auth/register answers 201 with the token and user', async () => {
    authService.register.mockResolvedValue({ token: 't', user: { id: '1' } });

    const res = await send('POST', '/api/auth/register', {
      name: 'Sam',
      email: 'sam@example.com',
      password: 'a-good-password',
      // Can't sign up already verified
      emailVerified: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ token: 't', user: { id: '1' } });
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Sam',
      email: 'sam@example.com',
      password: 'a-good-password',
    });
  });

  test('POST /api/auth/login answers with the token and user', async () => {
    authService.login.mockResolvedValue({ token: 't', user: { id: '1' } });

    const res = await send('POST', '/api/auth/login', { email: 'sam@example.com', password: 'a-good-password' });

    expect(res.status).toBe(200);
    expect(authService.login).toHaveBeenCalledWith({ email: 'sam@example.com', password: 'a-good-password' });
  });

  test.each([
    [true, true],
    [false, false],
    // Only exactly true counts, not text or other values that look true
    ['true', false],
    [1, false],
    [undefined, false],
  ])('POST /api/auth/send-verification with resend %p asks for a new code: %p', async (resend, expected) => {
    authService.sendVerificationCode.mockResolvedValue();

    const res = await send('POST', '/api/auth/send-verification', { resend });

    expect(res.status).toBe(204);
    expect(authService.sendVerificationCode).toHaveBeenCalledWith(sam._id, { resend: expected });
  });

  test('POST /api/auth/verify-email checks the code for the logged-in user', async () => {
    authService.verifyEmail.mockResolvedValue({ id: '1', emailVerified: true });

    const res = await send('POST', '/api/auth/verify-email', { code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: '1', emailVerified: true } });
    expect(authService.verifyEmail).toHaveBeenCalledWith(sam._id, '123456');
  });

  test("POST /api/auth/forgot-password gives the same answer whether or not there's an account", async () => {
    authService.requestPasswordReset.mockResolvedValue();

    const res = await send('POST', '/api/auth/forgot-password', { email: 'anyone@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'If an account exists for this email, we sent it a code.' });
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('anyone@example.com');
  });

  test('POST /api/auth/reset-password answers with the token and user', async () => {
    authService.resetPassword.mockResolvedValue({ token: 't', user: { id: '1' } });

    const res = await send('POST', '/api/auth/reset-password', {
      email: 'sam@example.com',
      code: '123456',
      password: 'a-new-password',
    });

    expect(res.status).toBe(200);
    expect(authService.resetPassword).toHaveBeenCalledWith({
      email: 'sam@example.com',
      code: '123456',
      password: 'a-new-password',
    });
  });

  test("GET /api/auth/me sends the user's profile without the password hash", async () => {
    const res = await send('GET', '/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: sam.id, email: 'sam@example.com', name: 'Sam', emailVerified: true });
    expect(res.text).not.toContain('passwordHash');
  });

  test('DELETE /api/auth/me deletes the logged-in user\'s account, answering 204', async () => {
    authService.deleteAccount.mockResolvedValue();

    const res = await send('DELETE', '/api/auth/me');

    expect(res.status).toBe(204);
    expect(authService.deleteAccount).toHaveBeenCalledWith(sam._id);
  });
});
