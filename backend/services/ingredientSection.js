/**
 * Finds the ingredient list in all the text read from a product photo.
 *
 * OCR reads everything on the package: the brand, marketing text,
 * directions, warnings, the address. The ingredient list always starts with
 * a heading such as "Ingredients:", so this keeps only the text from that
 * heading to the end of the list.
 *
 * This is a pure function, tested in tests/ingredientSection.test.js.
 */

// An "Ingredients" heading, in English or French, ending with a colon or a
// line break so marketing text ("made with natural ingredients like aloe")
// isn't mistaken for one:
//   "Ingredients:"  "INGREDIENTS" + new line  "Ingrédients :"
//   "Ingredients/Ingrédients:"  "Inactive Ingredients:"
// Not after "key", "featured", "hero" or "star": those introduce a few
// highlighted ingredients, not the full list.
const HEADING_PATTERN =
  /(?<!\b(?:key|featured|hero|star|natural)\s+)\b(?:(?:in)?active\s+)?ingr[eé]dients?\b(?:\s*[/|]\s*ingr[eé]dients?\b)?[ \t]*(?::|\n)/gi;

// Things that start a new section of the label, so the list has ended.
// They count only at the start of a line or after a period.
const NEXT_SECTION_WORDS = [
  // English
  'directions',
  'how to use',
  'to use',
  'use',
  'apply',
  'warnings?',
  'caution',
  'precautions?',
  'keep out of reach',
  'for external use',
  'avoid contact',
  'distributed',
  'dist\\.',
  'manufactured',
  'mfd\\.',
  'made in',
  'made for',
  'made by',
  'product of',
  'packaged',
  'net wt',
  'net weight',
  'net contents',
  'questions',
  'storage',
  'store',
  'best before',
  'exp\\b',
  'lot\\b',
  'www\\.',
  'https?:',
  // French
  "mode d['’]emploi",
  'avertissements?',
  'attention',
  'fabriqué',
  'distribué',
  'conserver',
];
const NEXT_SECTION_PATTERN = new RegExp(
  `(?:^|\\n|\\.)[ \\t]*(?:${NEXT_SECTION_WORDS.join('|')})(?![a-zà-ÿ])`,
  'i'
);

// Short words that end in a period inside an ingredient list, so their
// period doesn't end the list: "D&C Red No. 17", "Aloe Leaf Ext."
const ABBREVIATIONS = new Set(['no', 'ext', 'extr', 'vit', 'approx', 'inc', 'co', 'sp', 'spp']);

/**
 * @param {string} text  all the text read from the photo
 * @returns {string | null}  just the ingredient list(s), or null if there's
 *   no "Ingredients" heading
 */
function extractIngredientSection(text) {
  if (typeof text !== 'string') return null;

  const headings = [...text.matchAll(HEADING_PATTERN)];
  if (headings.length === 0) return null;

  const sections = headings.map((heading, index) => {
    const start = heading.index + heading[0].length;
    // A second heading (e.g. the French list) also ends this section
    const nextHeading = headings[index + 1]?.index ?? text.length;
    const section = text.slice(start, nextHeading);
    return section.slice(0, findEnd(section)).trim();
  });

  const result = sections.filter(Boolean).join(',\n');
  return result || null;
}

/**
 * Where an ingredient list ends: at the first period that ends a line (or
 * the text), or at the start of the next section, whichever comes first.
 */
function findEnd(section) {
  let end = section.length;

  // A period at the end of a line, unless it's an abbreviation like "No."
  for (const match of section.matchAll(/\.(?=[ \t]*(?:\n|$))/g)) {
    const wordBefore = section.slice(0, match.index).match(/([a-z]+)$/i)?.[1]?.toLowerCase();
    if (!ABBREVIATIONS.has(wordBefore)) {
      end = match.index;
      break;
    }
  }

  const nextSection = section.match(NEXT_SECTION_PATTERN);
  if (nextSection) end = Math.min(end, nextSection.index);

  return end;
}

module.exports = { extractIngredientSection };
