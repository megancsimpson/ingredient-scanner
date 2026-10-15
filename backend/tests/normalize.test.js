const { normalizeIngredient } = require('../utils/normalize');

// normalizeIngredient is how a name on a label and a name in the database
// are compared: both go through it, so these must give the same result
describe('normalizeIngredient', () => {
  test.each([
    ['lowercases', 'Coconut OIL', 'coconut oil'],
    ['trims and collapses spaces', '  Coconut   Oil  ', 'coconut oil'],
    ['turns punctuation into spaces', 'D&C Red #17', 'd c red 17'],
    ['treats "D&C" and "D & C" the same', 'D & C Red # 17', 'd c red 17'],
    ['turns hyphens into spaces', 'Laureth-4', 'laureth 4'],
    ['keeps numbers', 'PEG-100 Stearate', 'peg 100 stearate'],
    ['keeps "+" (used in some names)', 'Vitamin C+', 'vitamin c+'],
    ['turns slashes and parentheses into spaces', 'Water/Aqua (Eau)', 'water aqua eau'],
    ['turns line breaks and tabs into spaces', 'Isopropyl\nMyristate\t', 'isopropyl myristate'],
    ['turns commas between digits into a space', '1,2-Hexanediol', '1 2 hexanediol'],
    // French names on bilingual labels compare like English ones
    ['removes accents', 'Glycérine', 'glycerine'],
    ['removes accents in capitals', 'TOCOPHÉROL', 'tocopherol'],
    ['removes other accents', 'Beurre de Karité, Crème, Naïve', 'beurre de karite creme naive'],
  ])('%s', (_, input, expected) => {
    expect(normalizeIngredient(input)).toBe(expected);
  });

  test.each([
    ['an empty string', ''],
    ['only punctuation', '--- ***'],
    ['a number', 42],
    ['null', null],
    ['undefined', undefined],
    ['an object', { $ne: '' }],
  ])('returns "" for %s', (_, input) => {
    expect(normalizeIngredient(input)).toBe('');
  });

  test('gives the same result when run twice', () => {
    const once = normalizeIngredient('Cocos Nucifera (Coconut) Oil');
    expect(normalizeIngredient(once)).toBe(once);
  });
});
