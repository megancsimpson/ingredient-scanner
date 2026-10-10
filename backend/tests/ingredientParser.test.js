const { parseIngredients } = require('../services/ingredientParser');

// Most tests only care about the normalized names, so this keeps them short
const normalizedNames = (text) => parseIngredients(text).map((i) => i.normalized);

describe('parseIngredients', () => {
  describe('splitting the list', () => {
    test('splits on commas and normalizes each ingredient', () => {
      expect(normalizedNames('Water, Coconut Oil, Shea Butter')).toEqual([
        'water',
        'coconut oil',
        'shea butter',
      ]);
    });

    test('keeps the original name for display', () => {
      expect(parseIngredients('Laureth-4, D&C Red 17').map((i) => i.name)).toEqual([
        'Laureth-4',
        'D&C Red 17',
      ]);
    });

    test('accepts semicolons and bullets as separators', () => {
      expect(normalizedNames('Water; Glycerin • Mica')).toEqual(['water', 'glycerin', 'mica']);
    });

    test('treats each line as an ingredient when there are no commas', () => {
      expect(normalizedNames('Water\nCoconut Oil\nShea Butter')).toEqual([
        'water',
        'coconut oil',
        'shea butter',
      ]);
    });

    test('joins a name that OCR wrapped onto the next line', () => {
      expect(normalizedNames('Water, Coconut\nOil, Shea Butter')).toEqual([
        'water',
        'coconut oil',
        'shea butter',
      ]);
    });

    test('does not split on commas inside parentheses', () => {
      expect(normalizedNames('Fragrance (Parfum, Limonene), Water')).toEqual([
        'fragrance parfum limonene',
        'water',
      ]);
    });

    test('still splits correctly when OCR misses a closing parenthesis', () => {
      expect(normalizedNames('Water (Aqua, Glycerin, Shea Butter')).toEqual([
        'water aqua',
        'glycerin',
        'shea butter',
      ]);
    });
  });

  describe('cleaning up label text', () => {
    test('removes the "Ingredients:" heading', () => {
      expect(normalizedNames('Ingredients: Water, Glycerin')).toEqual(['water', 'glycerin']);
    });

    test('handles active and inactive ingredient sections', () => {
      const text = 'Active Ingredients: Zinc Oxide 20% Inactive Ingredients: Water, Dimethicone';
      expect(normalizedNames(text)).toEqual(['zinc oxide', 'water', 'dimethicone']);
    });

    test('removes percentages', () => {
      expect(normalizedNames('Zinc Oxide 20%, Titanium Dioxide 2.5 %')).toEqual([
        'zinc oxide',
        'titanium dioxide',
      ]);
    });

    test('handles a "May Contain (+/-)" section', () => {
      const text = 'Talc, Mica. May Contain (+/-): Iron Oxides (CI 77491), Titanium Dioxide';
      expect(normalizedNames(text)).toEqual([
        'talc',
        'mica',
        'iron oxides ci 77491',
        'titanium dioxide',
      ]);
    });

    test('ignores empty entries, extra spaces and the final period', () => {
      expect(normalizedNames('  Water ,, Glycerin ,  Shea   Butter. ')).toEqual([
        'water',
        'glycerin',
        'shea butter',
      ]);
      expect(parseIngredients('Water, Shea Butter.')[1].name).toBe('Shea Butter');
    });

    test('drops footnotes such as "*Certified Organic"', () => {
      const text = 'Aloe Leaf Juice*, Shea Butter†, Tocopherol. *Certified Organic †Fair Trade';
      expect(normalizedNames(text)).toEqual(['aloe leaf juice', 'shea butter', 'tocopherol']);
    });

    test('lists an ingredient only once if it appears twice', () => {
      expect(normalizedNames('Water, Glycerin, water')).toEqual(['water', 'glycerin']);
    });
  });

  describe('variants for matching', () => {
    test('includes each slash-separated name', () => {
      const [water] = parseIngredients('Water/Aqua/Eau');
      expect(water.name).toBe('Water/Aqua/Eau');
      expect(water.variants).toEqual(['water aqua eau', 'water', 'aqua', 'eau']);
    });

    test('includes the name with and without its parentheses', () => {
      const [corn] = parseIngredients('Zea Mays (Corn) Oil');
      // The full form is how "Zea Mays (Corn) Oil" is stored in the database
      expect(corn.variants).toEqual(['zea mays corn oil', 'zea mays oil', 'corn']);
    });

    test('splits names inside parentheses', () => {
      const [fragrance] = parseIngredients('Fragrance (Parfum, Limonene)');
      expect(fragrance.variants).toEqual([
        'fragrance parfum limonene',
        'fragrance',
        'parfum',
        'limonene',
      ]);
    });

    test('has just one variant for a plain name', () => {
      expect(parseIngredients('Glycerin')[0].variants).toEqual(['glycerin']);
    });
  });

  describe('unusual input', () => {
    test.each([[''], ['   '], [',,,'], [null], [undefined], [42]])(
      'returns an empty list for %p',
      (input) => {
        expect(parseIngredients(input)).toEqual([]);
      }
    );
  });
});
