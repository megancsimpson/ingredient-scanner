const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const HttpError = require('../utils/httpError');
const { normalizeIngredient } = require('../utils/normalize');
const { parseIngredients } = require('./ingredientParser');
const { matchIngredients } = require('./ingredientMatcher');

// Longer than any real ingredient name; stops huge search strings
const MAX_SEARCH_LENGTH = 200;

/**
 * Searches the pore-clogging ingredient list. An ingredient is included if:
 *
 *   1. its name or an alias contains the search text, so typing "myri"
 *      finds "Isopropyl Myristate" and "Myristate"; or
 *   2. it would flag the search text if that were on a label (the same rule
 *      the scanner uses), so "Cocos Nucifera (Coconut) Oil" finds
 *      "Coconut", "Cocos", "Cocos Nucifera" and "Coconut Oil".
 *
 * No search text returns the whole list. Results are A to Z.
 *
 * The list is small (a few hundred ingredients), so it's loaded and searched
 * in memory rather than with a database query. That lets the search reuse
 * the scanner's parser and matcher, so search and scanning always agree.
 *
 * @param {string} [search]
 * @returns {Promise<object[]>} Ingredient documents
 */
async function searchIngredients(search = '') {
  if (typeof search !== 'string') search = '';
  if (search.length > MAX_SEARCH_LENGTH) {
    throw new HttpError(400, `Search is too long (max ${MAX_SEARCH_LENGTH} characters).`);
  }

  const all = await Ingredient.find().sort({ name: 1 }).collation({ locale: 'en' });
  const query = normalizeIngredient(search);
  if (!query) return all;

  // Rule 2: which database ingredients would flag the search text
  const [flagged] = matchIngredients(parseIngredients(search), all);
  const wouldFlag = new Set((flagged?.matches ?? []).map((match) => match._id.toString()));

  return all.filter(
    (ingredient) =>
      wouldFlag.has(ingredient.id) ||
      ingredient.normalized.includes(query) ||
      ingredient.aliases.some((alias) => alias.includes(query))
  );
}

/**
 * One ingredient by ID.
 */
async function getIngredient(id) {
  const notFound = new HttpError(404, 'Ingredient not found.');
  if (!mongoose.isValidObjectId(id)) throw notFound;

  const ingredient = await Ingredient.findById(id);
  if (!ingredient) throw notFound;
  return ingredient;
}

module.exports = { searchIngredients, getIngredient };
