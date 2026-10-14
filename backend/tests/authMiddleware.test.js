// Replace Passport with a fake that "finds" whichever user the test sets,
// so the middleware can be tested without real tokens or a database.
// (Jest only lets a mock use outside variables whose names start with "mock".)
let mockUserFromToken = null;
jest.mock('../config/passport', () => ({
  authenticate: (strategy, options, callback) => () => callback(null, mockUserFromToken),
}));

const { requireAuth, requireLogin } = require('../middleware/auth');

// Runs a middleware and reports what it did: called next(), or sent a response
function run(middleware) {
  const req = {};
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { req, res, next };
}

describe('requireAuth', () => {
  test('lets in a verified user', () => {
    mockUserFromToken = { emailVerified: true };
    const { req, next } = run(requireAuth);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBe(mockUserFromToken);
  });

  test('blocks an unverified user with 403', () => {
    mockUserFromToken = { emailVerified: false };
    const { res, next } = run(requireAuth);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('blocks a missing or invalid token with 401', () => {
    mockUserFromToken = false;
    const { res, next } = run(requireAuth);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireLogin', () => {
  test('lets in an unverified user', () => {
    mockUserFromToken = { emailVerified: false };
    const { next } = run(requireLogin);
    expect(next).toHaveBeenCalled();
  });

  test('still blocks a missing or invalid token with 401', () => {
    mockUserFromToken = false;
    const { res, next } = run(requireLogin);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
