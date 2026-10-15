/**
 * Normalizes an ingredient name so different spellings of the same name match.
 *
 * - removes accents ("é" -> "e"), so French names on bilingual labels
 *   ("Glycérine") compare like English ones ("Glycerine")
 * - lowercases
 * - replaces anything that isn't a letter, number or "+" with a space
 * - collapses repeated spaces and trims
 *
 * Examples:
 *   "D & C Red # 17"   -> "d c red 17"
 *   "D&C Red 17"       -> "d c red 17"
 *   "Laureth-4"        -> "laureth 4"
 *   "  Coconut  Oil "  -> "coconut oil"
 *   "Tocophérol"       -> "tocopherol"
 *
 * The same function is used when seeding the database and when parsing
 * a scanned ingredient list, so both sides always compare like with like.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeIngredient(name) {
  if (typeof name !== 'string') return '';
  return (
    name
      // "NFD" splits an accented letter into the letter and its accent
      // ("é" becomes "e" plus a separate accent mark); the accent marks
      // (Unicode U+0300 to U+036F) are then removed. Without this, the next
      // step would turn "é" into a space: "Glycérine" -> "glyc rine".
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

module.exports = { normalizeIngredient };
