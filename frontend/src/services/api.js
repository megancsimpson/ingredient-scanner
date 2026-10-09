// All calls to the backend go through this file.
const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Checks that the backend is running.
 * @returns {Promise<{status: string}>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }
  return response.json();
}