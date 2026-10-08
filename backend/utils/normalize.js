/**
 * Normalizes an ingredient name so different spellings of the same name match.
 *
 * - lowercases
 * - replaces anything that isn't a letter, number or "+" with a space
 * - collapses repeated spaces and trims
 *
 * Examples:
 *   "D & C Red # 17"   -> "d c red 17"
 *   "D&C Red 17"       -> "d c red 17"
 *   "Laureth-4"        -> "laureth 4"
 *   "  Coconut  Oil "  -> "coconut oil"
 *
 * The same function is used when seeding the database and when parsing
 * a scanned ingredient list, so both sides always compare like with like.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeIngredient(name) {
  if (typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { normalizeIngredient };
