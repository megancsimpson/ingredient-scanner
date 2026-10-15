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

    test('ends at the end of its paragraph, before the company details', () => {
      // ocrService puts a blank line between the paragraphs Vision finds
      const text =
        'Ingredients: Water, Glycerin, Shea Butter\n\nAcme Beauty Inc.\n123 Main St, Austin, TX 78701';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin, Shea Butter');
    });

    test('ends before a trademark paragraph', () => {
      const text = 'Ingredients: Water, Glycerin\n\nGlow™ is a trademark of Acme Beauty Inc.';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin');
    });

    test('finds the list when the heading is a paragraph of its own', () => {
      const text = 'INGREDIENTS\n\nWater, Glycerin\n\nAcme Beauty Inc.';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin');
    });

    test('continues into the next paragraph after a trailing comma', () => {
      const text = 'Ingredients: Water, Glycerin,\n\nShea Butter, Tocopherol\n\nAcme Beauty Inc.';
      expect(extractIngredientSection(text)).toBe('Water, Glycerin,\n\nShea Butter, Tocopherol');
    });

    test('continues into a next paragraph that starts mid-name', () => {
      const text = 'Ingredients: Water, Butyrospermum Parkii\n\nbutter, Glycerin\n\nAcme Beauty Inc.';
      expect(extractIngredientSection(text)).toBe('Water, Butyrospermum Parkii\n\nbutter, Glycerin');
    });

    test('continues when a wrapped name starts the next paragraph with a capital', () => {
      // Vision sometimes splits one list into several paragraphs
      const text =
        'Ingredients: Water, Cocos Nucifera (Coconut)\n\nOil, Glycerin, Shea Butter\n\nTocopherol, Citric Acid.\n\nAcme Beauty Inc.';
      expect(extractIngredientSection(text)).toBe(
        'Water, Cocos Nucifera (Coconut)\n\nOil, Glycerin, Shea Butter\n\nTocopherol, Citric Acid'
      );
    });

    test('continues through paragraphs with pigment numbers and trademark symbols', () => {
      const text = 'Ingredients: Water, Mica\n\nCI 77891, CI 77491\n\nPhyto Blend™ [Aloe, Rose]';
      expect(extractIngredientSection(text)).toBe(
        'Water, Mica\n\nCI 77891, CI 77491\n\nPhyto Blend™ [Aloe, Rose]'
      );
    });

    test.each([
      ['a company name', 'Acme Beauty LLC'],
      ['a street address', 'Acme Beauty\n123 Main Street, Austin TX'],
      ['a phone number', 'Questions? Call (512) 555-0123'],
      ['a website', 'Glow Skin\nglowskin.com'],
      ['an email address', 'hello@glowskin.ca'],
      ['a Canadian postal code', 'Glow Skin, Toronto ON M5V 2T6'],
      ['a copyright line', '© 2026 Glow Skin'],
    ])('ends before a paragraph with %s, even with no period', (_, paragraph) => {
      const text = `Ingredients: Water, Glycerin, Shea Butter\n\n${paragraph}`;
      expect(extractIngredientSection(text)).toBe('Water, Glycerin, Shea Butter');
    });

    test('does not end at a period in the middle of a line', () => {
      // OCR often misreads a comma as a period; stopping there would miss
      // the rest of the list
      const text = 'Ingredients: Water. Glycerin, Shea Butter\n\nAcme Beauty Inc.';
      expect(extractIngredientSection(text)).toBe('Water. Glycerin, Shea Butter');
    });

    test('does not stop at words that only start like a section word', () => {
      // "Useful", "Storax" and "Applied" aren't "Use", "Store" or "Apply"
      const text = 'Ingredients:\nUseful Extract,\nStorax Resin,\nApplied Oil.';
      expect(extractIngredientSection(text)).toBe('Useful Extract,\nStorax Resin,\nApplied Oil');
    });
  });

  describe('barcodes, batch numbers and the "12M" symbol', () => {
    const LIST = 'Ingredients: Water, Linalool,\nHexyl Cinnamal';

    test.each([
      ['a barcode in groups', '8 40035 21996 7'],
      ['a barcode in one piece', '840035219967'],
      ['a batch number', '2621 402139600'],
      ['the "12M" symbol', '12M'],
      ['all of them, on separate lines', '2621 402139600\n12M\n8 40035 21996 7'],
    ])('ends before a line with %s', (_, numbers) => {
      expect(extractIngredientSection(`${LIST}\n${numbers}`)).toBe('Water, Linalool,\nHexyl Cinnamal');
    });

    test('ends before them in their own paragraph', () => {
      const text = `${LIST}\n\n2621 402139600\n\n8 40035 21996 7`;
      expect(extractIngredientSection(text)).toBe('Water, Linalool,\nHexyl Cinnamal');
    });

    test('ends before a long number read onto the same line as the last ingredient', () => {
      const text = 'Ingredients: Water, Linalool, Hexyl Cinnamal 2621 402139600 12M';
      expect(extractIngredientSection(text)).toBe('Water, Linalool, Hexyl Cinnamal');
    });

    test.each([
      ['pigment numbers', 'Mica,\nCI 77891, CI 77491, CI 77492'],
      ['pigment numbers without commas', 'Iron Oxides (CI 77491 CI 77492)'],
      ['a number wrapped onto its own line', 'Polysorbate\n20, Glycerin'],
      ['numbers in names', 'PEG-100 Stearate, 1,2-Hexanediol, Red 40, Laureth-23'],
      ['a short number alone on a line', 'Ceteareth-\n20'],
    ])('keeps %s', (_, list) => {
      expect(extractIngredientSection(`Ingredients: ${list}`)).toBe(list);
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
