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

  return textWithParagraphs(data.responses[0].fullTextAnnotation);
}

// What goes after a letter, from Vision's "detectedBreak": a space, a line
// break, or a hyphen where a word was split across two lines
const BREAKS = {
  SPACE: ' ',
  SURE_SPACE: ' ',
  EOL_SURE_SPACE: '\n',
  LINE_BREAK: '\n',
  HYPHEN: '-\n',
};

/**
 * Rebuilds the text from Vision's layout (pages > blocks > paragraphs >
 * words > letters) with a blank line between paragraphs.
 *
 * Vision's plain "text" has line breaks but no paragraph gaps, so the
 * ingredient list runs straight into the company name and address printed
 * under it. The blank lines let extractIngredientSection stop at the end of
 * the ingredient paragraph.
 *
 * Exported for tests.
 *
 * @param {object} [annotation] Vision's fullTextAnnotation
 * @returns {string}
 */
function textWithParagraphs(annotation) {
  if (!annotation?.pages) return annotation?.text ?? '';

  const paragraphs = [];
  for (const page of annotation.pages) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        let text = '';
        for (const word of paragraph.words ?? []) {
          for (const symbol of word.symbols ?? []) {
            text += symbol.text + (BREAKS[symbol.property?.detectedBreak?.type] ?? '');
          }
        }
        paragraphs.push(text.trim());
      }
    }
  }
  return paragraphs.filter(Boolean).join('\n\n');
}

module.exports = { extractText, textWithParagraphs };
