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

// The words of an "Ingredients" heading, in English or French:
//   "Ingredients"  "Ingrédients"  "Ingredients/Ingrédients"  "Inactive Ingredients"
const HEADING_WORDS = String.raw`(?:(?:in)?active\s+)?ingr[eé]dients?\b(?:\s*[/|]\s*ingr[eé]dients?\b)?`;

// A heading is either:
//   - the words followed by a colon, anywhere: "Ingredients:" "Ingrédients :"
//     (not after "key", "featured", "hero", "star" or "natural": those
//     introduce a few highlighted ingredients, not the full list), or
//   - the words alone on their own line, with no colon: "INGREDIENTS"
// Without a colon, the words must be the whole line, because marketing text
// can wrap right after the word "ingredients" ("made with ingredients" /
// "that promote healing..."), and that line isn't a heading. "made with
// natural ingredients like aloe" has neither, so it's never a heading.
const HEADING_PATTERN = new RegExp(
  String.raw`(?<!\b(?:key|featured|hero|star|natural)\s+)\b${HEADING_WORDS}[ \t]*:` +
    '|' +
    String.raw`(?<=^|\n)[ \t]*${HEADING_WORDS}[ \t]*\n`,
  'gi'
);

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
  'trademarks?',
  '©',
  'patent',
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

// Signs that a paragraph is the company's details or legal text rather
// than more of the ingredient list. Deliberately not "™"/"®" (blend names
// use them) or 5-digit numbers (pigments like "CI 77891" have them).
const COMPANY_PATTERN = new RegExp(
  [
    '\\b(?:inc|llc|ltd|corp|corporation|gmbh|pty|limited)\\b', // Acme Beauty Inc.
    '\\bco\\.', //                                   Acme Co.
    '\\b\\d+\\s+(?:\\w+\\s+){1,3}(?:street|st|avenue|ave|road|rd|blvd|boulevard|drive|dr|lane|ln|way|suite|ste)\\b', // 123 Main St
    '\\(?\\d{3}\\)?[\\s.-]\\d{3}[\\s.-]\\d{4}', //      phone number
    '[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d', //                     Canadian postal code
    'www\\.|https?:|\\.com\\b|@', //                    website or email
    '©|\\btrademarks?\\b|\\ball rights reserved\\b',
  ].join('|'),
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
 * Where an ingredient list ends, whichever comes first:
 *   - a period that ends a line or paragraph (the list is finished)
 *   - a paragraph that looks like company details or legal text (name,
 *     address, phone, website, trademark), which is often printed straight
 *     under the list without a period before it. Paragraphs are separated
 *     by blank lines, which ocrService adds from Vision's layout.
 *   - the start of the next section ("Directions", "Made in", ...)
 *   - barcode digits, batch numbers or the "12M" symbol (see
 *     findBarcodeNumbers)
 *
 * Other paragraph breaks don't end the list: Vision sometimes splits one
 * list into several paragraphs, e.g. where a long name wraps.
 *
 * A period in the middle of a line doesn't end the list either: OCR often
 * misreads a comma as a period in small print. Stopping too early would
 * silently miss ingredients, which is worse than including a little extra
 * text the user can delete on the review screen.
 */
function findEnd(section) {
  let end = section.length;

  // Each paragraph after the first: stop before the first that looks like
  // company or legal text
  const paragraphBreaks = [...section.matchAll(/\n[ \t]*\n/g)];
  for (const [i, blankLine] of paragraphBreaks.entries()) {
    const paragraphStart = blankLine.index + blankLine[0].length;
    const paragraphEnd = paragraphBreaks[i + 1]?.index ?? section.length;
    if (COMPANY_PATTERN.test(section.slice(paragraphStart, paragraphEnd))) {
      end = blankLine.index;
      break;
    }
  }

  // A period at the end of a line, unless it's an abbreviation like "No."
  for (const match of section.matchAll(/\.(?=[ \t]*(?:\n|$))/g)) {
    const wordBefore = section.slice(0, match.index).match(/([a-z]+)$/i)?.[1]?.toLowerCase();
    if (!ABBREVIATIONS.has(wordBefore)) {
      end = Math.min(end, match.index);
      break;
    }
  }

  const nextSection = section.match(NEXT_SECTION_PATTERN);
  if (nextSection) end = Math.min(end, nextSection.index);

  const numbers = findBarcodeNumbers(section);
  if (numbers !== -1) end = Math.min(end, numbers);

  return end;
}

/**
 * Where barcode digits, batch numbers or the "12M" symbol (use within 12
 * months of opening) start, or -1 if there are none. OCR reads these from
 * the package too, and without this they end up stuck to the last
 * ingredient: "Hexyl Cinnamal 2621 402139600 12M 8 40035 21996 7".
 *
 * Ingredients have numbers too ("CI 77491", "Polysorbate 20", "PEG-100"),
 * so only these count:
 *   - a line of nothing but numbers (and "12M") with at least 8 digits in
 *     all, or with "12M". A short number alone on a line, like the "20" of
 *     a wrapped "Polysorbate 20", doesn't count.
 *   - a number of 6 or more digits partway along a line, which no
 *     ingredient has (pigment numbers have 5). Numbers of 4 or more digits
 *     just before it count too: "2621 402139600".
 */
function findBarcodeNumbers(section) {
  const isNumber = (word) => /^\d+$/.test(word);
  const isOpenedSymbol = (word) => /^\d{1,2}M$/i.test(word);

  for (const line of section.matchAll(/[^\n]+/g)) {
    const words = [...line[0].matchAll(/\S+/g)].map((word) => ({
      text: word[0],
      start: line.index + word.index,
    }));
    if (words.length === 0) continue;

    const onlyNumbers = words.every((word) => isNumber(word.text) || isOpenedSymbol(word.text));
    if (onlyNumbers) {
      const digits = words.reduce((count, word) => count + word.text.replace(/\D/g, '').length, 0);
      if (digits >= 8 || words.some((word) => isOpenedSymbol(word.text))) return line.index;
    }

    const long = words.findIndex((word) => isNumber(word.text) && word.text.length >= 6);
    if (long !== -1) {
      let first = long;
      while (first > 0 && isNumber(words[first - 1].text) && words[first - 1].text.length >= 4) {
        first -= 1;
      }
      return words[first].start;
    }
  }
  return -1;
}

module.exports = { extractIngredientSection };
