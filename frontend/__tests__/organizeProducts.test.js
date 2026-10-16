import { organizeProducts } from '../src/utils/organizeProducts';

/** A saved product as the server sends it in the list (fields the list uses). */
function product(productName, fields = {}) {
  return { id: productName, productName, createdAt: '2026-10-01T12:00:00Z', flagged: [], ...fields };
}

/** Just the section titles and product names, so the expected results are easy to read. */
const summary = (sections) => sections.map((s) => ({ title: s.title, names: s.data.map((p) => p.productName) }));

describe('organizeProducts', () => {
  test.each(['newest', 'name', 'brand', 'category', 'clear'])(
    'returns no sections for an empty list (%s)',
    (sortBy) => {
      expect(organizeProducts([], sortBy)).toEqual([]);
    }
  );

  describe('newest', () => {
    test('puts the most recently saved first, in one section with no title', () => {
      const products = [
        product('Older', { createdAt: '2026-09-01T12:00:00Z' }),
        product('Newest', { createdAt: '2026-10-12T08:00:00Z' }),
        product('Middle', { createdAt: '2026-10-01T12:00:00Z' }),
      ];

      expect(summary(organizeProducts(products, 'newest'))).toEqual([
        { title: null, names: ['Newest', 'Middle', 'Older'] },
      ]);
    });

    test('compares the time too, not just the day', () => {
      const products = [
        product('Morning', { createdAt: '2026-10-12T08:00:00Z' }),
        product('Evening', { createdAt: '2026-10-12T20:00:00Z' }),
      ];

      expect(summary(organizeProducts(products, 'newest'))[0].names).toEqual(['Evening', 'Morning']);
    });

    test('is used when no sort is given', () => {
      const products = [
        product('Older', { createdAt: '2026-09-01T12:00:00Z' }),
        product('Newer', { createdAt: '2026-10-01T12:00:00Z' }),
      ];

      expect(summary(organizeProducts(products))[0].names).toEqual(['Newer', 'Older']);
    });
  });

  describe('name', () => {
    test('sorts A to Z, ignoring capitals', () => {
      const products = [product('serum'), product('Cleanser'), product('moisturizer'), product('Balm')];

      expect(summary(organizeProducts(products, 'name'))).toEqual([
        { title: null, names: ['Balm', 'Cleanser', 'moisturizer', 'serum'] },
      ]);
    });

    test('puts numbers in order ("Cream 2" before "Cream 10")', () => {
      const products = [product('Cream 10'), product('Cream 2'), product('Cream 1')];

      expect(summary(organizeProducts(products, 'name'))[0].names).toEqual(['Cream 1', 'Cream 2', 'Cream 10']);
    });

    test('sorts accented letters with the plain ones ("Élixir" between "Day" and "Foam")', () => {
      const products = [product('Foam'), product('Élixir'), product('Day Cream')];

      expect(summary(organizeProducts(products, 'name'))[0].names).toEqual(['Day Cream', 'Élixir', 'Foam']);
    });
  });

  describe('brand', () => {
    test('groups by brand A to Z, with names A to Z inside each', () => {
      const products = [
        product('Toner', { brand: 'Zeta' }),
        product('Serum', { brand: 'Acme' }),
        product('Cleanser', { brand: 'Acme' }),
      ];

      expect(summary(organizeProducts(products, 'brand'))).toEqual([
        { title: 'Acme', names: ['Cleanser', 'Serum'] },
        { title: 'Zeta', names: ['Toner'] },
      ]);
    });

    test('puts "acme" and "Acme " in the same group, titled with the first spelling', () => {
      const products = [
        product('Serum', { brand: 'acme' }),
        product('Cleanser', { brand: 'Acme ' }),
      ];

      expect(summary(organizeProducts(products, 'brand'))).toEqual([
        { title: 'acme', names: ['Cleanser', 'Serum'] },
      ]);
    });

    test('puts products without a brand (missing, empty or only spaces) last, under "No brand"', () => {
      const products = [
        product('Mask'),
        product('Balm', { brand: '' }),
        product('Oil', { brand: '   ' }),
        product('Serum', { brand: 'Acme' }),
      ];

      expect(summary(organizeProducts(products, 'brand'))).toEqual([
        { title: 'Acme', names: ['Serum'] },
        { title: 'No brand', names: ['Balm', 'Mask', 'Oil'] },
      ]);
    });
  });

  describe('category', () => {
    test("groups in the category list's order (not A to Z), with the newest first inside each", () => {
      const products = [
        product('Day Cream', { category: 'moisturizer', createdAt: '2026-09-01T12:00:00Z' }),
        product('Foam', { category: 'cleanser' }),
        product('Night Cream', { category: 'moisturizer', createdAt: '2026-10-12T12:00:00Z' }),
      ];

      // Cleanser comes before Moisturizer in utils/categories.js
      expect(summary(organizeProducts(products, 'category'))).toEqual([
        { title: 'Cleanser', names: ['Foam'] },
        { title: 'Moisturizer', names: ['Night Cream', 'Day Cream'] },
      ]);
    });

    test('uses the display name as the title ("eye" -> "Eye care")', () => {
      const sections = organizeProducts([product('Eye Gel', { category: 'eye' })], 'category');

      expect(sections[0].title).toBe('Eye care');
    });

    test('puts products without a category last, under "No category"', () => {
      const products = [product('Mystery'), product('Foam', { category: 'cleanser' })];

      expect(summary(organizeProducts(products, 'category'))).toEqual([
        { title: 'Cleanser', names: ['Foam'] },
        { title: 'No category', names: ['Mystery'] },
      ]);
    });
  });

  describe('clear ("Non pore-clogging")', () => {
    test('shows only products with no flagged ingredients, newest first', () => {
      const products = [
        product('Clean Old', { createdAt: '2026-09-01T12:00:00Z' }),
        product('Flagged', { flagged: [{ name: 'Coconut Oil' }] }),
        product('Clean New', { createdAt: '2026-10-12T12:00:00Z' }),
      ];

      expect(summary(organizeProducts(products, 'clear'))).toEqual([
        { title: null, names: ['Clean New', 'Clean Old'] },
      ]);
    });

    test('returns no sections when every product has a flagged ingredient', () => {
      // So the screen can show its "nothing here" message
      const products = [product('Flagged', { flagged: [{ name: 'Coconut Oil' }] })];

      expect(organizeProducts(products, 'clear')).toEqual([]);
    });
  });

  test("doesn't change the order of the list it was given", () => {
    // The screen keeps the server's list and organizes it again when the
    // sort changes, so the original must stay as it was
    const products = [product('B'), product('A', { createdAt: '2026-10-12T12:00:00Z' })];
    const before = [...products];

    for (const sortBy of ['newest', 'name', 'brand', 'category', 'clear']) {
      organizeProducts(products, sortBy);
    }

    expect(products).toEqual(before);
  });
});
