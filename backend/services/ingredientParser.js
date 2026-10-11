const { normalizeIngredient } = require('../utils/normalize');

// "Ingredients:", "Active Ingredients:", "Inactive Ingredients:",
// "May Contain:", "May Contain (+/-):" (case-insensitive)
const HEADING_PATTERN =
  /(?:(?:in)?active\s+)?ingredients\s*:|may\s+contain\s*(?:[([]\s*\+\s*\/\s*-\s*[)\]])?\s*:?/gi;

// "20%", "2.5 %"
const PERCENT_PATTERN = /\d+(?:\.\d+)?\s*%/g;

// Bullet symbols used in lists copied from websites and documents. They
// always separate ingredients, at the start of a line or in the middle.
const BULLET_CHARS = '•●▪◦‣∙·⁃■□○◆◇★☆✓✔➢➤►▶';
const BULLET_PATTERN = new RegExp(`[${BULLET_CHARS}]`, 'g');
const LEADING_BULLET_PATTERN = new RegExp(`^\\s*[${BULLET_CHARS}]`);

// Markers at the start of a line that make it a list item: "- ", "* ",
// "– ", "1. ", "2) ". These need a space after them, so names like
// "Laureth-4" or a "*Certified Organic" footnote aren't affected.
const LINE_MARKER_PATTERN = /^[ \t]*(?:[-*–—]|\d{1,2}[.)])[ \t]+/;

// A line that is only a heading, with no colon: "Ingredients", "Full
// Ingredient List". Compared after normalizing.
const HEADING_ONLY = new Set([
  'ingredients',
  'ingredient',
  'ingredient list',
  'ingredients list',
  'full ingredients',
  'full ingredient list',
  'active ingredients',
  'inactive ingredients',
  'other ingredients',
  'key ingredients',
]);

/**
 * True for text that's clearly not an ingredient: an email address, a web
 * address, a phone number or a copyright line, as found in website footers.
 */
function isContactOrLegalText(name) {
  return (
    /\S+@\S+\.\S+/.test(name) || // email
    /https?:\/\/|www\.|\.com\b/i.test(name) || // web address
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}/.test(name) || // phone, e.g. (512) 555-0123
    /©|\(c\)\s*\d{4}|all rights reserved/i.test(name) // copyright
  );
}

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

  // Windows line endings (\r\n) become plain line breaks
  const lines = text.replace(/\r\n?/g, '\n').split('\n');

  // Is this one ingredient per line, or a comma-separated label?
  //   - Any line starting with a bullet or list marker: one per line.
  //   - Otherwise, compare commas to lines. A label has many commas per
  //     line, and its line breaks are just OCR wrapping long names
  //     ("Coconut\nOil"). A pasted list has few or no commas, and the ones
  //     it has are usually in other text, like an address in a website
  //     footer ("Austin, TX"), so line breaks separate ingredients.
  const contentLines = lines.filter((line) => line.trim() !== '');
  const isBulleted = contentLines.some(
    (line) => LINE_MARKER_PATTERN.test(line) || LEADING_BULLET_PATTERN.test(line)
  );
  const commaCount = (text.replace(HEADING_PATTERN, '').match(/[,;]/g) || []).length;
  const onePerLine = isBulleted || commaCount < contentLines.length;

  const cleaned = lines
    // "- Water" -> "Water"
    .map((line) => line.replace(LINE_MARKER_PATTERN, ''))
    .join('\n')
    // Headings such as "Ingredients:" or "Inactive Ingredients:" become a
    // comma, so the text on either side ends up as separate ingredients
    .replace(HEADING_PATTERN, ',')
    // Bullets separate ingredients: "Water • Glycerin"
    .replace(BULLET_PATTERN, ',')
    // "Zinc Oxide 20%" -> "Zinc Oxide"
    .replace(PERCENT_PATTERN, ' ')
    // "Tocopherol. *Certified Organic": a period before a footnote marker
    // ends the list, so the footnote becomes its own piece (skipped below)
    .replace(/\.\s*(?=[*†])/g, ',');

  // In a comma-separated label, a line break is just wrapping: make it a space
  const prepared = onePerLine ? cleaned : cleaned.replace(/\n/g, ' ');
  const separators = onePerLine ? [',', ';', '\n'] : [',', ';'];

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
    // Skip a heading on its own line, e.g. "Ingredients" with no colon
    if (HEADING_ONLY.has(normalized)) return;
    // Skip contact details and copyright lines copied from a website
    if (isContactOrLegalText(name)) return;
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
