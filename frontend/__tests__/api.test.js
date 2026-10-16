import * as api from '../src/services/api';

// No real server in these tests: fetch is replaced with a fake ("mock")
// that records each request and gives back the answer a test chooses
beforeEach(() => {
  global.fetch = jest.fn();
  // Start every test logged out, with no "log out" handler
  api.setAuthToken(null);
  api.setUnauthorizedHandler(null);
});

/** Makes the fake server answer the next request with this status and JSON body. */
function serverAnswers(status, body) {
  fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    // A 204 has no body, so reading it as JSON fails, as it does in the app
    json: body === undefined ? () => Promise.reject(new SyntaxError('No body')) : () => Promise.resolve(body),
  });
}

/** The request the app sent: { url, method, headers, body }. */
function sentRequest() {
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0];
  return {
    url,
    method: options.method ?? 'GET',
    headers: options.headers,
    body: options.body === undefined ? undefined : JSON.parse(options.body),
  };
}

describe('sending requests', () => {
  test('sends JSON, without a login token when logged out', async () => {
    serverAnswers(200, { status: 'ok' });

    await api.checkHealth();

    const { headers } = sentRequest();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers).not.toHaveProperty('Authorization');
  });

  test('sends the login token as "Bearer <token>" once logged in', async () => {
    api.setAuthToken('my-token');
    serverAnswers(200, { products: [] });

    await api.getSavedProducts();

    expect(sentRequest().headers.Authorization).toBe('Bearer my-token');
  });

  test('stops sending the token after logging out', async () => {
    api.setAuthToken('my-token');
    api.setAuthToken(null);
    serverAnswers(200, { products: [] });

    await api.getSavedProducts();

    expect(sentRequest().headers).not.toHaveProperty('Authorization');
  });
});

describe('answers', () => {
  test("returns the server's JSON", async () => {
    serverAnswers(200, { products: [{ id: '1', productName: 'Night Cream' }] });

    await expect(api.getSavedProducts()).resolves.toEqual({
      products: [{ id: '1', productName: 'Night Cream' }],
    });
  });

  test('returns null for an answer with no body (204)', async () => {
    serverAnswers(204, undefined);

    await expect(api.deleteSavedProduct('1')).resolves.toBeNull();
  });

  test("gives a friendly message when the server can't be reached", async () => {
    // fetch fails like this with no Wi-Fi, or when the server isn't running
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const error = await api.getSavedProducts().catch((err) => err);

    expect(error.message).toBe("Couldn't reach the server. Check your connection and try again.");
    expect(error.status).toBeUndefined();
  });

  test("uses the server's error message, with the status", async () => {
    serverAnswers(400, { error: 'Please enter an ingredient list.' });

    const error = await api.analyzeIngredients('').catch((err) => err);

    expect(error.message).toBe('Please enter an ingredient list.');
    expect(error.status).toBe(400);
  });

  test('passes on the saved product from a duplicate (409), for the "Already saved" question', async () => {
    const duplicate = { id: '1', productName: 'Night Cream', brand: 'Acme', createdAt: '2026-10-10T12:00:00Z' };
    serverAnswers(409, { error: 'You already saved this product.', duplicate });

    const error = await api.saveProduct({ productName: 'Night Cream', rawText: 'Water' }).catch((err) => err);

    expect(error.status).toBe(409);
    expect(error.data.duplicate).toEqual(duplicate);
  });

  test("says which status came back when the error isn't the server's usual JSON", async () => {
    // e.g. a proxy's HTML error page
    serverAnswers(502, undefined);

    const error = await api.getSavedProducts().catch((err) => err);

    expect(error.message).toBe('Server responded with 502');
    expect(error.status).toBe(502);
    expect(error.data).toBeNull();
  });
});

describe('logging out when the login stops working', () => {
  test('a 401 while logged in calls the "log out" handler', async () => {
    const logOut = jest.fn();
    api.setUnauthorizedHandler(logOut);
    api.setAuthToken('expired-token');
    serverAnswers(401, { error: 'Your session has expired. Please log in again.' });

    await expect(api.getSavedProducts()).rejects.toThrow('Your session has expired. Please log in again.');
    expect(logOut).toHaveBeenCalledTimes(1);
  });

  test("a 401 while logged out (a wrong password) doesn't", async () => {
    const logOut = jest.fn();
    api.setUnauthorizedHandler(logOut);
    serverAnswers(401, { error: 'Incorrect email or password.' });

    await expect(api.login({ email: 'sam@example.com', password: 'wrong' })).rejects.toThrow(
      'Incorrect email or password.'
    );
    expect(logOut).not.toHaveBeenCalled();
  });

  test("other errors while logged in (like 403, email not verified) don't", async () => {
    const logOut = jest.fn();
    api.setUnauthorizedHandler(logOut);
    api.setAuthToken('my-token');
    serverAnswers(403, { error: 'Please verify your email first.' });

    await expect(api.getSavedProducts()).rejects.toThrow();
    expect(logOut).not.toHaveBeenCalled();
  });
});

describe('each call goes to the right address with the right body', () => {
  test.each([
    ['checkHealth', () => api.checkHealth(), 'GET', '/api/health', undefined],
    [
      'register',
      () => api.register({ name: 'Sam', email: 'sam@example.com', password: 'a-good-password' }),
      'POST',
      '/api/auth/register',
      { name: 'Sam', email: 'sam@example.com', password: 'a-good-password' },
    ],
    [
      'login',
      () => api.login({ email: 'sam@example.com', password: 'a-good-password' }),
      'POST',
      '/api/auth/login',
      { email: 'sam@example.com', password: 'a-good-password' },
    ],
    [
      'sendVerificationCode (keeps a code that still works)',
      () => api.sendVerificationCode(),
      'POST',
      '/api/auth/send-verification',
      { resend: false },
    ],
    [
      'sendVerificationCode (new code)',
      () => api.sendVerificationCode({ resend: true }),
      'POST',
      '/api/auth/send-verification',
      { resend: true },
    ],
    ['verifyEmail', () => api.verifyEmail('123456'), 'POST', '/api/auth/verify-email', { code: '123456' }],
    [
      'requestPasswordReset',
      () => api.requestPasswordReset('sam@example.com'),
      'POST',
      '/api/auth/forgot-password',
      { email: 'sam@example.com' },
    ],
    [
      'resetPassword',
      () => api.resetPassword({ email: 'sam@example.com', code: '123456', password: 'a-new-password' }),
      'POST',
      '/api/auth/reset-password',
      { email: 'sam@example.com', code: '123456', password: 'a-new-password' },
    ],
    ['getMe', () => api.getMe(), 'GET', '/api/auth/me', undefined],
    ['deleteAccount', () => api.deleteAccount(), 'DELETE', '/api/auth/me', undefined],
    ['getSavedProducts', () => api.getSavedProducts(), 'GET', '/api/products', undefined],
    ['getSavedProduct', () => api.getSavedProduct('abc123'), 'GET', '/api/products/abc123', undefined],
    [
      'saveProduct',
      () =>
        api.saveProduct({
          productName: 'Night Cream',
          brand: 'Acme',
          category: 'moisturizer',
          rawText: 'Water, Coconut Oil',
          source: 'photo',
          onDuplicate: 'keep',
        }),
      'POST',
      '/api/products',
      {
        productName: 'Night Cream',
        brand: 'Acme',
        category: 'moisturizer',
        rawText: 'Water, Coconut Oil',
        source: 'photo',
        onDuplicate: 'keep',
      },
    ],
    [
      'updateSavedProduct',
      () => api.updateSavedProduct('abc123', { productName: 'Day Cream', category: null }),
      'PATCH',
      '/api/products/abc123',
      // null removes the category, so it must be sent; fields left out aren't
      { productName: 'Day Cream', category: null },
    ],
    ['deleteSavedProduct', () => api.deleteSavedProduct('abc123'), 'DELETE', '/api/products/abc123', undefined],
    [
      'searchIngredients',
      () => api.searchIngredients('coconut & shea'),
      'GET',
      // Spaces and "&" are encoded, so "& shea" isn't read as another setting
      '/api/ingredients?search=coconut%20%26%20shea',
      undefined,
    ],
    ['getIngredient', () => api.getIngredient('xyz789'), 'GET', '/api/ingredients/xyz789', undefined],
    ['readIngredientPhoto', () => api.readIngredientPhoto('base64-photo'), 'POST', '/api/ocr', { image: 'base64-photo' }],
    ['analyzeIngredients', () => api.analyzeIngredients('Water'), 'POST', '/api/analyze', { text: 'Water' }],
  ])('%s', async (_, call, method, path, body) => {
    serverAnswers(200, {});

    await call();

    const sent = sentRequest();
    expect(sent.url.endsWith(path)).toBe(true);
    expect(sent.method).toBe(method);
    expect(sent.body).toEqual(body);
  });

  test('encodes IDs, so an odd ID can\'t reach a different address', async () => {
    serverAnswers(200, {});

    await api.getSavedProduct('../auth/me');

    expect(sentRequest().url.endsWith('/api/products/..%2Fauth%2Fme')).toBe(true);
  });
});
