const path = require('path');
const { matchIngredients } = require('../services/ingredientMatcher');
const { parseIngredients } = require('../services/ingredientParser');
const { loadIngredients } = require('../seed/seedIngredients');

// A small stand-in for the Ingredient collection
const db = [
  { _id: '1', name: 'Coconut', normalized: 'coconut', aliases: [], sources: ['Face Reality'] },
  {
    _id: '2',
    name: 'Isopropyl Myristate',
    normalized: 'isopropyl myristate',
    aliases: ['ipm'],
    sources: ['Acne Clinic NYC', 'Face Reality'],
  },
  { _id: '3', name: 'Laureth-4', normalized: 'laureth 4', aliases: [], sources: ['Acne Clinic NYC'] },
  { _id: '4', name: 'Coconut Oil', normalized: 'coconut oil', aliases: [], sources: ['Acne Clinic NYC'] },
  { _id: '5', name: 'D&C Red 17', normalized: 'd c red 17', aliases: [], sources: ['Acne Clinic NYC'] },
  {
    _id: '6',
    name: 'Zea Mays (Corn) Oil',
    normalized: 'zea mays corn oil',
    aliases: [],
    sources: ['Acne Clinic NYC'],
  },
];

// Parse a label and return just the names that were flagged
const flaggedNames = (text, ingredients = db) =>
  matchIngredients(parseIngredients(text), ingredients).map((f) => f.name);

describe('matchIngredients', () => {
  describe('which ingredients are flagged', () => {
    test('flags an exact match', () => {
      expect(flaggedNames('Water, Isopropyl Myristate, Glycerin')).toEqual(['Isopropyl Myristate']);
    });

    test('flags any ingredient containing a keyword', () => {
      expect(flaggedNames('Coconut Alkanes, Cocos Nucifera (Coconut) Oil, Water')).toEqual([
        'Coconut Alkanes',
        'Cocos Nucifera (Coconut) Oil',
      ]);
    });

    test('flags an ingredient containing a multi-word name', () => {
      expect(flaggedNames('Hydrogenated Coconut Oil')).toEqual(['Hydrogenated Coconut Oil']);
    });

    test('matches whole words only', () => {
      // "laureth 4" is not in "laureth 40", and "coconut" is not in "coconutty"
      expect(flaggedNames('Laureth-40, Coconutty Extract')).toEqual([]);
    });

    test('matches regardless of capitals and punctuation', () => {
      expect(flaggedNames('ISOPROPYL MYRISTATE, D & C Red # 17, Laureth 4')).toEqual([
        'ISOPROPYL MYRISTATE',
        'D & C Red # 17',
        'Laureth 4',
      ]);
    });

    test('matches on aliases', () => {
      expect(flaggedNames('IPM, Water')).toEqual(['IPM']);
    });

    test('matches a slash-separated name on any of its parts', () => {
      expect(flaggedNames('Water/Coconut')).toEqual(['Water/Coconut']);
    });

    test('matches a database name with parentheses when the label leaves them out', () => {
      expect(flaggedNames('Zea Mays Corn Oil')).toEqual(['Zea Mays Corn Oil']);
    });

    test('flags nothing when no ingredients match', () => {
      expect(flaggedNames('Water, Glycerin, Niacinamide')).toEqual([]);
    });

    test('keeps the order of the label', () => {
      expect(flaggedNames('Laureth-4, Water, Isopropyl Myristate')).toEqual([
        'Laureth-4',
        'Isopropyl Myristate',
      ]);
    });
  });

  describe('what a flagged ingredient includes', () => {
    test('lists every database ingredient it matched, with sources combined', () => {
      const [flagged] = matchIngredients(parseIngredients('Coconut Oil'), db);

      expect(flagged).toEqual({
        name: 'Coconut Oil',
        normalized: 'coconut oil',
        sources: ['Face Reality', 'Acne Clinic NYC'],
        matches: [
          { _id: '1', name: 'Coconut', sources: ['Face Reality'] },
          { _id: '4', name: 'Coconut Oil', sources: ['Acne Clinic NYC'] },
        ],
      });
    });

    test('does not repeat a source', () => {
      const [flagged] = matchIngredients(parseIngredients('Isopropyl Myristate'), db);
      expect(flagged.sources).toEqual(['Acne Clinic NYC', 'Face Reality']);
    });

    test('matches a database ingredient once even if several variants hit it', () => {
      // "Water/Coconut" has variants "water coconut" and "coconut"; both contain "coconut"
      const [flagged] = matchIngredients(parseIngredients('Water/Coconut'), db);
      expect(flagged.matches).toHaveLength(1);
    });

    test('handles database ingredients with no aliases or sources fields', () => {
      const minimal = [{ name: 'Shea', normalized: 'shea' }];
      const [flagged] = matchIngredients(parseIngredients('Shea Butter'), minimal);
      expect(flagged.sources).toEqual([]);
      expect(flagged.matches).toEqual([{ _id: undefined, name: 'Shea', sources: [] }]);
    });
  });

  describe('unusual input', () => {
    test('returns an empty list when there are no ingredients', () => {
      expect(matchIngredients([], db)).toEqual([]);
    });

    test('returns an empty list when the database list is empty', () => {
      expect(matchIngredients(parseIngredients('Coconut Oil'), [])).toEqual([]);
    });

    test.each([[null], [undefined], ['Coconut Oil']])(
      'returns an empty list when the ingredients are %p',
      (input) => {
        expect(matchIngredients(input, db)).toEqual([]);
      }
    );
  });

  describe('with the real ingredient list', () => {
    // The same data the seed script loads into MongoDB (no database needed)
    const realDb = loadIngredients(path.join(__dirname, '..', 'seed', 'data', 'ingredients.json'));

    test('flags known pore-clogging ingredients on a typical label', () => {
      const label =
        'Ingredients: Aqua/Water/Eau, Isopropyl Myristate, Cocos Nucifera (Coconut) Oil, ' +
        'Butyrospermum Parkii (Shea) Butter, Glycerin, D&C Red 17, Tocopherol.';

      expect(flaggedNames(label, realDb)).toEqual([
        'Isopropyl Myristate',
        'Cocos Nucifera (Coconut) Oil',
        'Butyrospermum Parkii (Shea) Butter',
        'D&C Red 17',
      ]);
    });

    test('does not flag ingredients that are not on the list', () => {
      expect(flaggedNames('Water, Glycerin, Niacinamide, Hyaluronic Acid', realDb)).toEqual([]);
    });
  });
});
