const { parseIngredients } = require('../services/ingredientParser');
const { looksLikeIngredientList } = require('../services/ingredientListCheck');

// Parses the text the same way the app does, then checks it
const check = (text, flagged) => looksLikeIngredientList(parseIngredients(text), flagged);

describe('looksLikeIngredientList', () => {
  test.each([
    ['a typical moisturizer', 'Water, Glycerin, Niacinamide, Cetearyl Alcohol, Phenoxyethanol, Xanthan Gum, Carbomer'],
    ['a balm with Latin plant names', 'Butyrospermum Parkii (Shea) Butter, Cera Alba, Simmondsia Chinensis Seed Oil, Rosmarinus Officinalis Leaf Extract'],
    ['a shampoo', 'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Sodium Chloride, Parfum, Citric Acid, Linalool'],
    ['makeup with pigments', 'Talc, Mica, Dimethicone, CI 77491, CI 77492, CI 77499, Titanium Dioxide'],
    ['a one-ingredient oil', 'Jojoba Oil'],
    ['a one-ingredient product', 'Squalane'],
    ['a one-per-line list', 'Water\nGlycerin\nTocopherol\nPEG-100 Stearate'],
  ])('accepts %s', (_, text) => {
    expect(check(text)).toBe(true);
  });

  test.each([
    ['random words', 'hello world'],
    ['a sentence', 'This is a test'],
    ['a product review', 'I love this moisturizer, it smells nice and feels great on my skin'],
    ['keyboard mashing', 'asdf, qwerty, zxcv'],
    ['empty text', ''],
  ])('rejects %s', (_, text) => {
    expect(check(text)).toBe(false);
  });

  test('counts flagged ingredients, even if their names look unusual', () => {
    // Seaweed names have none of the usual ingredient words, but they're
    // on the pore-clogging list
    const text = 'Kelp, Chondrus Crispus, Ahnfeltia Concinna';
    expect(check(text)).toBe(false);
    const flagged = parseIngredients(text);
    expect(check(text, flagged)).toBe(true);
  });

  test('accepts a list where only some items look like ingredients', () => {
    // Half is enough, so an odd botanical name or two doesn't trigger a warning
    expect(check('Water, Kelp, Glycerin, Dulse')).toBe(true);
  });

  test('rejects a list where most items do not', () => {
    expect(check('Water, banana, rainbow, keyboard, sunshine')).toBe(false);
  });
});
