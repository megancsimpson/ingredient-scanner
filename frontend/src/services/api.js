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
 * is the HTTP status code (or undefined if the server couldn't be reached),
 * and "data" is the full response body, for errors with extra details
 * (e.g. the existing product when saving a duplicate).
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
    error.data = data;
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
 * Permanently deletes the logged-in user's account and saved products.
 * @returns {Promise<null>}
 */
export function deleteAccount() {
  return request('/api/auth/me', { method: 'DELETE' });
}

/**
 * @typedef {{
 *   id: string,
 *   productName: string,
 *   brand?: string,
 *   category?: string,          a code from utils/categories.js
 *   rawText: string,
 *   ingredients: { name: string, normalized: string }[],
 *   flagged: { name: string, normalized: string, sources: string[],
 *              matches: { name: string, sources: string[] }[] }[],
 *   source: 'photo' | 'paste',
 *   createdAt: string,
 * }} SavedProduct
 */

/**
 * The logged-in user's saved products, newest first. Each one leaves out
 * rawText and ingredients; use getSavedProduct() for those.
 * @returns {Promise<{ products: SavedProduct[] }>}
 */
export function getSavedProducts() {
  return request('/api/products');
}

/**
 * One saved product with everything in it.
 * @param {string} id
 * @returns {Promise<{ product: SavedProduct }>}
 */
export function getSavedProduct(id) {
  return request(`/api/products/${encodeURIComponent(id)}`);
}

/**
 * Saves a product. The server analyzes rawText itself, so the results
 * don't need to be sent.
 *
 * If a product with the same name and brand is already saved, this throws
 * an error with status 409 and error.data.duplicate set to the existing
 * product ({ id, productName, brand, createdAt }). Call again with
 * onDuplicate 'replace' (delete the old one) or 'keep' (save both).
 *
 * @param {{ productName: string, brand?: string, category?: string | null,
 *            rawText: string, source: 'photo' | 'paste',
 *            onDuplicate?: 'replace' | 'keep' }} product
 * @returns {Promise<{ product: SavedProduct }>}
 */
export function saveProduct({ productName, brand, category, rawText, source, onDuplicate }) {
  return request('/api/products', {
    method: 'POST',
    body: JSON.stringify({ productName, brand, category, rawText, source, onDuplicate }),
  });
}

/**
 * Changes a saved product's name, brand and/or category. An empty brand or
 * a null category removes it.
 *
 * Like saveProduct, throws a 409 with error.data.duplicate if the new name
 * and brand match another saved product; call again with onDuplicate
 * 'replace' (delete the other one) or 'keep' (keep both).
 *
 * @param {string} id
 * @param {{ productName?: string, brand?: string, category?: string | null,
 *           onDuplicate?: 'replace' | 'keep' }} changes
 * @returns {Promise<{ product: SavedProduct }>}
 */
export function updateSavedProduct(id, { productName, brand, category, onDuplicate }) {
  return request(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ productName, brand, category, onDuplicate }),
  });
}

/**
 * Deletes one saved product.
 * @param {string} id
 * @returns {Promise<null>}
 */
export function deleteSavedProduct(id) {
  return request(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * @typedef {{ id: string, name: string, aliases: string[], sources: string[], notes?: string }} Ingredient
 */

/**
 * Searches the pore-clogging ingredient list. Finds ingredients whose name
 * contains the search, plus any that would flag it if it were on a label.
 * An empty search returns the whole list. Results are A to Z.
 * @param {string} search
 * @returns {Promise<{ ingredients: Ingredient[] }>}
 */
export function searchIngredients(search) {
  return request(`/api/ingredients?search=${encodeURIComponent(search)}`);
}

/**
 * One ingredient's details.
 * @param {string} id
 * @returns {Promise<{ ingredient: Ingredient }>}
 */
export function getIngredient(id) {
  return request(`/api/ingredients/${encodeURIComponent(id)}`);
}

/**
 * Reads the text in a photo of an ingredient list (OCR on the server).
 * @param {string} imageBase64 a base64-encoded JPEG
 * @returns {Promise<{ text: string }>}
 */
export function readIngredientPhoto(imageBase64) {
  return request('/api/ocr', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64 }),
  });
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
