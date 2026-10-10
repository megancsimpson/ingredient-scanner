// All calls to the backend go through this file.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Sends a request to the backend and returns the JSON response.
 * Throws an Error with a message that can be shown to the user if the
 * server can't be reached or responds with an error.
 *
 * @param {string} path e.g. '/api/analyze'
 * @param {RequestInit} [options] fetch options (method, body, ...)
 */
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    // fetch only throws when there's no response at all (no Wi-Fi, server
    // not running, wrong EXPO_PUBLIC_API_URL)
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  // The backend sends { error: "..." } for every error
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Server responded with ${response.status}`);
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
