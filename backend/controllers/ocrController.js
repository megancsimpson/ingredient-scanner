const { extractText } = require('../services/ocrService');

// Base64 makes a file about a third bigger, so this allows a photo of about
// 4.5 MB. The app shrinks photos to well under 1 MB before sending them.
const MAX_IMAGE_LENGTH = 6 * 1024 * 1024;

/**
 * POST /api/ocr
 * Body:     { image: "<base64 JPEG or PNG>" }
 * Response: 200 { text }
 *           400 missing or too-large image, or one that can't be read
 *           422 no text found in the photo
 *           502/503 the OCR service failed or isn't set up
 */
async function ocr(req, res) {
  const { image } = req.body || {};

  if (typeof image !== 'string' || image === '') {
    return res.status(400).json({ error: 'Please include a photo.' });
  }
  if (image.length > MAX_IMAGE_LENGTH) {
    return res.status(400).json({ error: 'That photo is too large. Please try again.' });
  }

  // Accept "data:image/jpeg;base64,..." too, by removing the prefix
  const base64 = image.replace(/^data:image\/\w+;base64,/, '');
  const text = (await extractText(base64)).trim();

  if (text === '') {
    return res.status(422).json({
      error:
        "Couldn't find any text in that photo. Try again with the ingredient list filling the frame, in good light.",
    });
  }

  res.json({ text });
}

module.exports = { ocr };
