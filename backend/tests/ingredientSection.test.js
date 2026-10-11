const { extractIngredientSection } = require('../services/ingredientSection');

describe('extractIngredientSection', () => {
  describe('finding the list', () => {
    test('keeps only the list from a whole bottle', () => {
      const text = [
        'GLOW SERUM',
        'with Vitamin C',
        '30 mL / 1 fl oz',
        'Directions: Apply to clean skin morning and night.',
        'Ingredients: Water, Glycerin, Niacinamide,',
        'Cocos Nucifera (Coconut) Oil, Tocopherol.',
        'Made in USA',
        'www.example.com',
      ].join('\n');
      expect(extractIngredientSection(text)).toBe(
        'Water, Glycerin, Niacinamide,\nCocos Nucifera (Coconut) Oil, Tocopherol'
      );
    });

    test('finds a heading on its own line with no colon', () => {
      const text = 'INGREDIENTS\nWater, Glycerin, Shea Butter\nWarnings: For external use only.';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin, Shea Butter');
    });

    test('finds French and bilingual headings', () => {
      expect(extractIngredientSection('Ingrédients : Aqua, Glycérine.')).toBe('Aqua, Glycérine');
      expect(extractIngredientSection('INGREDIENTS/INGRÉDIENTS: AQUA, GLYCERIN.')).toBe(
        'AQUA, GLYCERIN'
      );
    });

    test('keeps both lists on a label with separate English and French lists', () => {
      const text = 'Ingredients: Water, Glycerin.\nIngrédients : Eau, Glycérine.\nFabriqué au Canada';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin,\nEau, Glycérine');
    });

    test('keeps active and inactive ingredient sections', () => {
      const text = 'Active Ingredients: Zinc Oxide 20%\nInactive Ingredients: Water, Dimethicone.';
      expect(extractIngredientSection(text)).toBe('Zinc Oxide 20%,\nWater, Dimethicone');
    });
  });

  describe('ignoring text that only mentions ingredients', () => {
    test('ignores "ingredients" in a sentence', () => {
      const text =
        'Made with natural ingredients like aloe and shea.\nIngredients: Aloe Leaf Juice, Shea Butter.';
      expect(extractIngredientSection(text)).toBe('Aloe Leaf Juice, Shea Butter');
    });

    test('ignores "Key ingredients" highlights', () => {
      const text = 'Key ingredients: Niacinamide, Zinc\nIngredients: Water, Niacinamide, Zinc PCA.';
      expect(extractIngredientSection(text)).toBe('Water, Niacinamide, Zinc PCA');
    });
  });

  describe('finding the end of the list', () => {
    test('does not end at an abbreviation like "No."', () => {
      const text = 'Ingredients: Water, D&C Red No.\n17, Glycerin.\nMade in Canada';
      expect(extractIngredientSection(text)).toBe('Water, D&C Red No.\n17, Glycerin');
    });

    test('ends at the next section even without a period', () => {
      const text = 'Ingredients: Water, Glycerin\nDistributed by Example Co.';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin');
    });

    test('keeps a "May contain" part of the list', () => {
      const text = 'Ingredients: Talc, Mica, May Contain: Iron Oxides.\nNet Wt 5 g';
      expect(extractIngredientSection(text)).toBe('Talc, Mica, May Contain: Iron Oxides');
    });

    test('does not stop at words that only start like a section word', () => {
      // "Useful", "Storax" and "Applied" aren't "Use", "Store" or "Apply"
      const text = 'Ingredients:\nUseful Extract,\nStorax Resin,\nApplied Oil.';
      expect(extractIngredientSection(text)).toBe('Useful Extract,\nStorax Resin,\nApplied Oil');
    });
  });

  describe('no ingredient list', () => {
    test.each([['Water, Glycerin, Shea Butter'], [''], ['GLOW SERUM 30 mL'], [null]])(
      'returns null for %p',
      (text) => {
        expect(extractIngredientSection(text)).toBeNull();
      }
    );
  });
});
