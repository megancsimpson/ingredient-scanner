const HttpError = require('../utils/httpError');

// Google Cloud Vision's endpoint for reading text in images
const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

// How long to wait for Google before giving up
const TIMEOUT_MS = 20000;

/**
 * Reads the text in a photo using Google Cloud Vision.
 *
 * Uses DOCUMENT_TEXT_DETECTION, Vision's mode for dense text (like an
 * ingredient list) rather than a few words in a scene. It costs the same
 * as the basic mode: 1,000 photos a month free, then $1.50 per 1,000.
 *
 * This is the only file that knows which OCR provider is used. Switching
 * providers (see docs/ARCHITECTURE.md, "Open decisions") only means
 * changing this function; it takes a photo and returns its text.
 *
 * @param {string} imageBase64 a JPEG or PNG, base64-encoded, without a
 *   "data:image/jpeg;base64," prefix
 * @returns {Promise<string>} the text found ('' if none)
 */
async function extractText(imageBase64) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    // Photo scanning is optional for running the server, so this is
    // checked here rather than at startup
    console.error('GOOGLE_VISION_API_KEY is not set in backend/.env');
    throw new HttpError(503, 'Photo scanning is not available right now. Try pasting the list instead.');
  }

  let response;
  try {
    response = await fetch(`${VISION_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            // Most labels are in English; this helps with similar-looking letters
            imageContext: { languageHints: ['en'] },
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error('Could not reach Google Vision:', err.message);
    throw new HttpError(502, "Couldn't read the photo right now. Please try again.");
  }

  const data = await response.json().catch(() => null);
  // Google reports problems either for the whole request or for the image
  const problem = data?.error || data?.responses?.[0]?.error;
  if (!response.ok || problem) {
    // The details (e.g. billing not enabled, bad key) are for the developer,
    // not the user, so they're logged rather than sent to the app
    console.error('Google Vision error:', response.status, problem?.message);
    // Vision's error for a file that isn't a readable image
    if (problem?.code === 3) {
      throw new HttpError(400, "That photo couldn't be read. Please try a different photo.");
    }
    throw new HttpError(502, "Couldn't read the photo right now. Please try again.");
  }

  return data.responses[0].fullTextAnnotation?.text ?? '';
}

module.exports = { extractText };
