const { normalizeIngredient } = require('../utils/normalize');

// "Ingredients:", "Active Ingredients:", "Inactive Ingredients:",
// "May Contain:", "May Contain (+/-):" (case-insensitive)
const HEADING_PATTERN =
  /(?:(?:in)?active\s+)?ingredients\s*:|may\s+contain\s*(?:[([]\s*\+\s*\/\s*-\s*[)\]])?\s*:?/gi;

// "20%", "2.5 %"
const PERCENT_PATTERN = /\d+(?:\.\d+)?\s*%/g;

/**
 * Turns an ingredient list (from OCR or pasted by the user) into a clean list
 * of ingredients, ready to be compared against the database.
 *
 * This is a pure function: no database or network access, so it is easy to
 * test (see tests/ingredientParser.test.js).
 *
 * Example:
 *   parseIngredients('Ingredients: Water/Aqua/Eau, Zea Mays (Corn) Oil, Shea Butter 2%.')
 *   -> [
 *        { name: 'Water/Aqua/Eau', normalized: 'water aqua eau',
 *          variants: ['water aqua eau', 'water', 'aqua', 'eau'] },
 *        { name: 'Zea Mays (Corn) Oil', normalized: 'zea mays corn oil',
 *          variants: ['zea mays corn oil', 'zea mays oil', 'corn'] },
 *        { name: 'Shea Butter', normalized: 'shea butter',
 *          variants: ['shea butter'] },
 *      ]
 *
 * Each ingredient has:
 *   - name:       the ingredient as written on the label (for display)
 *   - normalized: the whole name normalized (for saving and de-duplicating)
 *   - variants:   every normalized name the ingredient could be listed under,
 *                 for the matcher to check. "Water/Aqua/Eau" is one
 *                 ingredient with three names; "Zea Mays (Corn) Oil" might be
 *                 in the database as the full name, without "(Corn)", or as
 *                 just "Corn".
 *
 * @param {string} text
 * @returns {{ name: string, normalized: string, variants: string[] }[]}
 */
function parseIngredients(text) {
  if (typeof text !== 'string') return [];

  const cleaned = text
    // Headings such as "Ingredients:" or "Inactive Ingredients:" become a
    // comma, so the text on either side ends up as separate ingredients
    .replace(HEADING_PATTERN, ',')
    // "Zinc Oxide 20%" -> "Zinc Oxide"
    .replace(PERCENT_PATTERN, ' ')
    // "Tocopherol. *Certified Organic": a period before a footnote marker
    // ends the list, so the footnote becomes its own piece (skipped below)
    .replace(/\.\s*(?=[*†])/g, ',');

  // Labels separate ingredients with commas. If there are none, the list is
  // probably one ingredient per line. If there are commas, a line break is
  // just OCR wrapping a long name ("Coconut\nOil"), so it becomes a space.
  const usesCommas = /[,;]/.test(text.replace(HEADING_PATTERN, ''));
  const prepared = usesCommas ? cleaned.replace(/\n/g, ' ') : cleaned;
  const separators = usesCommas ? [',', ';', '•'] : [',', ';', '•', '\n'];

  const ingredients = [];
  const seen = new Set();

  splitOutsideParentheses(prepared, separators).forEach((piece) => {
    const name = cleanName(piece);
    const normalized = normalizeIngredient(name);

    // Skip empty pieces (e.g. from ",," or a trailing comma) and repeats
    if (!normalized || seen.has(normalized)) return;
    // Skip footnotes like "*Certified Organic" or "†Organic"; the marker
    // comes after an ingredient's name, never before it
    if (/^[*†]/.test(name)) return;
    seen.add(normalized);

    ingredients.push({ name, normalized, variants: getVariants(name) });
  });

  return ingredients;
}

/**
 * Splits text on the given separator characters, except inside parentheses
 * or brackets, so "Fragrance (Parfum, Limonene), Water" stays two pieces.
 *
 * If the brackets don't pair up (OCR often misses one), they are ignored
 * so one missing ")" can't swallow the rest of the list.
 */
function splitOutsideParentheses(text, separators) {
  const opens = (text.match(/[([]/g) || []).length;
  const closes = (text.match(/[)\]]/g) || []).length;
  const trackBrackets = opens === closes;

  const pieces = [];
  let current = '';
  let depth = 0;

  for (const char of text) {
    if (trackBrackets && (char === '(' || char === '[')) depth += 1;
    if (trackBrackets && (char === ')' || char === ']')) depth -= 1;

    if (depth === 0 && separators.includes(char)) {
      pieces.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  pieces.push(current);

  return pieces;
}

/**
 * Tidies one piece for display: collapses whitespace and removes stray
 * punctuation at either end, like the period after the last ingredient.
 * "  Shea   Butter. " -> "Shea Butter"
 */
function cleanName(piece) {
  return piece
    .replace(/\s+/g, ' ')
    .replace(/^[\s.:\-]+|[\s.:\-]+$/g, '');
}

/**
 * Lists every normalized name an ingredient could appear under:
 *   - the whole name:                "zea mays corn oil"
 *   - the name without (...) parts:  "zea mays oil"
 *   - each part inside (...):        "corn"
 *   - each part between slashes:     "Water/Aqua/Eau" -> "water", "aqua", "eau"
 */
function getVariants(name) {
  const variants = [normalizeIngredient(name)];

  const outside = name.replace(/\([^)]*\)/g, ' ');
  variants.push(normalizeIngredient(outside));

  // Slash-separated names outside the parentheses
  const slashParts = outside.split('/');
  if (slashParts.length > 1) {
    slashParts.forEach((part) => variants.push(normalizeIngredient(part)));
  }

  // Each name inside parentheses, which may itself use commas or slashes:
  // "(CI 77891)", "(Parfum, Limonene)", "(Aqua/Eau)"
  for (const match of name.matchAll(/\(([^)]*)\)/g)) {
    match[1].split(/[,/]/).forEach((part) => variants.push(normalizeIngredient(part)));
  }

  // Remove blanks and duplicates, keeping the order above
  return [...new Set(variants.filter(Boolean))];
}

module.exports = { parseIngredients };
