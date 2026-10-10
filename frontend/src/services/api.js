// All calls to the backend go through this file.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// The logged-in user's token, sent with every request. AuthContext sets it
// when the user logs in or out, so screens never have to pass it around.
let authToken = null;

// Called when the server says the token is no longer valid (expired, or the
// account was deleted). AuthContext uses it to log the user out.
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/**
 * Sends a request to the backend and returns the JSON response.
 * Throws an Error with a message that can be shown to the user if the
 * server can't be reached or responds with an error. The error's "status"
 * is the HTTP status code (or undefined if the server couldn't be reached).
 *
 * @param {string} path e.g. '/api/analyze'
 * @param {RequestInit} [options] fetch options (method, body, ...)
 */
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
      },
    });
  } catch {
    // fetch only throws when there's no response at all (no Wi-Fi, server
    // not running, wrong EXPO_PUBLIC_API_URL)
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  // The backend sends { error: "..." } for every error
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // A 401 while logged in means the token stopped working. (A 401 while
    // logged out is just a wrong password, which the login screen shows.)
    if (response.status === 401 && authToken && onUnauthorized) {
      onUnauthorized();
    }
    const error = new Error(data?.error || `Server responded with ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

/**
 * Checks that the backend is running.
 * @returns {Promise<{status: string}>}
 */
export function checkHealth() {
  return request('/api/health');
}

/**
 * @typedef {{ id: string, name: string, email: string, createdAt: string }} User
 */

/**
 * Creates an account.
 * @param {{ name: string, email: string, password: string }} details
 * @returns {Promise<{ token: string, user: User }>}
 */
export function register({ name, email, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * Logs in with an email and password.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: User }>}
 */
export function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * The logged-in user's profile.
 * @returns {Promise<{ user: User }>}
 */
export function getMe() {
  return request('/api/auth/me');
}

/**
 * Checks an ingredient list for pore-clogging ingredients.
 * @param {string} text the ingredient list
 * @returns {Promise<{
 *   ingredients: { name: string, normalized: string }[],
 *   flagged: { name: string, normalized: string, sources: string[],
 *              matches: { _id: string, name: string, sources: string[] }[] }[]
 * }>}
 */
export function analyzeIngredients(text) {
  return request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}
