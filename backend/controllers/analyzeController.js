const { analyzeIngredientText } = require('../services/analysisService');

// Generous for a real label (most are under 2,000 characters) while
// stopping someone from sending huge amounts of text
const MAX_TEXT_LENGTH = 10000;

/**
 * POST /api/analyze
 * Body:     { "text": "Water, Coconut Oil, ..." }
 * Response: 200 { ingredients: [...], flagged: [...] }
 *           400 { error } if the text is missing, too long or has no ingredients
 */
async function analyze(req, res) {
  const { text } = req.body || {};

  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Please enter an ingredient list.' });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Ingredient list is too long (max ${MAX_TEXT_LENGTH} characters).` });
  }

  const result = await analyzeIngredientText(text);

  if (result.ingredients.length === 0) {
    return res.status(400).json({ error: "Couldn't find any ingredients in that text." });
  }

  res.json(result);
}

module.exports = { analyze };
