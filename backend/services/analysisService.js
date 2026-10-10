const Ingredient = require('../models/Ingredient');
const { parseIngredients } = require('./ingredientParser');
const { matchIngredients } = require('./ingredientMatcher');

/**
 * Checks an ingredient list against the pore-clogging ingredient database.
 *
 * This is where the database meets the pure parser and matcher: it loads
 * the ingredients from MongoDB, then hands them to matchIngredients().
 *
 * @param {string} text ingredient list from OCR or pasted by the user
 * @returns {Promise<{
 *   ingredients: { name: string, normalized: string }[],
 *   flagged: { name: string, normalized: string, sources: string[],
 *              matches: { _id: any, name: string, sources: string[] }[] }[]
 * }>}
 */
async function analyzeIngredientText(text) {
  const parsed = parseIngredients(text);

  // Nothing to look up, so skip the database
  if (parsed.length === 0) return { ingredients: [], flagged: [] };

  // .lean() returns plain objects instead of full Mongoose documents,
  // which is faster and all the matcher needs. Only the fields it uses
  // are loaded.
  const dbIngredients = await Ingredient.find({}, 'name normalized aliases sources').lean();

  return {
    // The full list for display and saving; "variants" are only for matching
    ingredients: parsed.map(({ name, normalized }) => ({ name, normalized })),
    flagged: matchIngredients(parsed, dbIngredients),
  };
}

module.exports = { analyzeIngredientText };
