const mongoose = require('mongoose');

// Fake the analysis (it would load ingredients from the database); the
// model itself is real, since validating a document doesn't need a database
jest.mock('../services/analysisService');

const SavedProduct = require('../models/SavedProduct');
const { createProduct, updateProduct } = require('../services/productService');

const USER = new mongoose.Types.ObjectId();
const PRODUCT = new mongoose.Types.ObjectId().toString();

// Checks a document against the model's rules; returns the errors, or
// null if it's valid
async function validationErrors(fields) {
  try {
    await new SavedProduct({ user: USER, rawText: 'Water', ...fields }).validate();
    return null;
  } catch (err) {
    return err.errors;
  }
}

// The error message for a product with this name, or null if it's valid
async function nameError(productName) {
  return (await validationErrors({ productName }))?.productName?.message ?? null;
}

describe('product and brand names', () => {
  test.each([
    'The Ordinary Niacinamide 10% + Zinc 1%',
    'Dr. Jart+',
    'e.l.f.',
    'No7',
    'L’Oréal Revitalift',
    "Paula's Choice 2% BHA",
    'La Roche-Posay Toleriane',
    '설화수 First Care',
    'Café — Day/Night #2',
  ])('accepts a real name: %s', async (name) => {
    expect(await nameError(name)).toBeNull();
  });

  test.each([
    ['only numbers', '12345'],
    ['only symbols', '!!!'],
    ['code-like characters', '<script>'],
    ['other symbols', 'Glow $$$'],
    ['emoji', 'Face 😀 Cream'],
  ])('rejects %s', async (_, name) => {
    expect(await nameError(name)).toBe('Please enter a valid product name.');
  });

  test('applies the same rule to the brand', async () => {
    const errors = await validationErrors({ productName: 'Night Cream', brand: '@@@' });
    expect(errors.brand.message).toBe('Please enter a valid brand name.');
  });
});

describe('fields sent as something other than text', () => {
  // An object like this can trick a database query if it gets that far
  const sneaky = { $ne: '' };

  test.each([
    ['productName', 'Product name'],
    ['brand', 'Brand'],
    ['category', 'Category'],
    ['source', 'Source'],
  ])('rejects %s when saving, before touching the database', async (field, label) => {
    const findOne = jest.spyOn(SavedProduct, 'findOne');
    const product = { productName: 'Night Cream', rawText: 'Water', [field]: sneaky };

    await expect(createProduct(USER, product)).rejects.toMatchObject({
      status: 400,
      message: `${label} must be text.`,
    });
    expect(findOne).not.toHaveBeenCalled();
    findOne.mockRestore();
  });

  test.each([
    ['productName', 'Product name'],
    ['brand', 'Brand'],
    ['category', 'Category'],
  ])('rejects %s when editing, before touching the database', async (field, label) => {
    const findOne = jest.spyOn(SavedProduct, 'findOne');

    await expect(updateProduct(USER, PRODUCT, { [field]: sneaky })).rejects.toMatchObject({
      status: 400,
      message: `${label} must be text.`,
    });
    expect(findOne).not.toHaveBeenCalled();
    findOne.mockRestore();
  });
});
