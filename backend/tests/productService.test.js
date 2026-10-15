const mongoose = require('mongoose');

// Fake the database model and the analysis, so these tests check the
// service's rules (whose products, what gets saved, duplicates) without
// MongoDB. Every database call is recorded, so the tests can check exactly
// what was asked for.
jest.mock('../models/SavedProduct');
jest.mock('../services/analysisService');

const SavedProduct = require('../models/SavedProduct');
const { analyzeIngredientText } = require('../services/analysisService');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../services/productService');

const USER = new mongoose.Types.ObjectId();
const PRODUCT_ID = new mongoose.Types.ObjectId().toString();
const OTHER_ID = new mongoose.Types.ObjectId();

// Mongoose queries can be awaited directly or chained first
// (.collation().sort()); this fakes both, ending in `result`
function query(result) {
  const chain = {
    collation: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

// What the analysis returns for the fake ingredient text
const ANALYSIS = {
  ingredients: [
    { name: 'Water', normalized: 'water' },
    { name: 'Coconut Oil', normalized: 'coconut oil' },
  ],
  flagged: [
    {
      name: 'Coconut Oil',
      normalized: 'coconut oil',
      sources: ['Face Reality'],
      matches: [{ _id: new mongoose.Types.ObjectId(), name: 'Coconut', sources: ['Face Reality'] }],
    },
  ],
};

beforeEach(() => {
  jest.resetAllMocks();
  analyzeIngredientText.mockResolvedValue(ANALYSIS);
  SavedProduct.findOne.mockReturnValue(query(null)); // no duplicate unless a test says so
  SavedProduct.create.mockImplementation(async (fields) => ({ id: PRODUCT_ID, ...fields }));
});

describe('only the owner can reach a product', () => {
  test('lists only the user’s products, newest first, without the long fields', async () => {
    SavedProduct.find.mockReturnValue(query([]));

    await listProducts(USER);

    expect(SavedProduct.find).toHaveBeenCalledWith({ user: USER }, '-rawText -ingredients');
    expect(SavedProduct.find.mock.results[0].value.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('looks a product up by its ID and the user’s ID together', async () => {
    const product = { productName: 'Night Cream' };
    SavedProduct.findOne.mockReturnValue(query(product));

    await expect(getProduct(USER, PRODUCT_ID)).resolves.toBe(product);
    expect(SavedProduct.findOne).toHaveBeenCalledWith({ _id: PRODUCT_ID, user: USER });
  });

  test('gives another user’s product the same 404 as one that doesn’t exist', async () => {
    // The query includes the user, so someone else's product isn't found
    SavedProduct.findOne.mockReturnValue(query(null));

    await expect(getProduct(USER, PRODUCT_ID)).rejects.toMatchObject({
      status: 404,
      message: 'Product not found.',
    });
  });

  test.each([
    ['getting', () => getProduct(USER, 'not-an-id')],
    ['editing', () => updateProduct(USER, 'not-an-id', { productName: 'X' })],
    ['deleting', () => deleteProduct(USER, 'not-an-id')],
  ])('gives a 404 for an invalid ID when %s, without asking the database', async (_, action) => {
    await expect(action()).rejects.toMatchObject({ status: 404 });
    expect(SavedProduct.findOne).not.toHaveBeenCalled();
    expect(SavedProduct.findOneAndUpdate).not.toHaveBeenCalled();
    expect(SavedProduct.findOneAndDelete).not.toHaveBeenCalled();
  });

  test('deletes by product ID and user ID together', async () => {
    SavedProduct.findOneAndDelete.mockResolvedValue({ id: PRODUCT_ID });

    await deleteProduct(USER, PRODUCT_ID);

    expect(SavedProduct.findOneAndDelete).toHaveBeenCalledWith({ _id: PRODUCT_ID, user: USER });
  });

  test('gives a 404 when deleting another user’s product', async () => {
    SavedProduct.findOneAndDelete.mockResolvedValue(null);

    await expect(deleteProduct(USER, PRODUCT_ID)).rejects.toMatchObject({ status: 404 });
  });

  test('edits by product ID and user ID together', async () => {
    SavedProduct.findOneAndUpdate.mockResolvedValue({ id: PRODUCT_ID });

    await updateProduct(USER, PRODUCT_ID, { category: 'serum' });

    expect(SavedProduct.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: PRODUCT_ID, user: USER });
  });

  test('gives a 404 when editing another user’s product', async () => {
    SavedProduct.findOneAndUpdate.mockResolvedValue(null);

    await expect(updateProduct(USER, PRODUCT_ID, { category: 'serum' })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('saving a product', () => {
  const product = { productName: 'Night Cream', rawText: 'Water, Coconut Oil', source: 'photo' };

  test('saves it to the logged-in user, with the server’s own analysis', async () => {
    await createProduct(USER, product);

    expect(analyzeIngredientText).toHaveBeenCalledWith('Water, Coconut Oil');
    const saved = SavedProduct.create.mock.calls[0][0];
    expect(saved.user).toBe(USER);
    expect(saved.ingredients).toEqual(ANALYSIS.ingredients);
    expect(saved.source).toBe('photo');
  });

  test('stores a copy of the flags without database IDs', async () => {
    await createProduct(USER, product);

    const [flag] = SavedProduct.create.mock.calls[0][0].flagged;
    expect(flag.matches).toEqual([{ name: 'Coconut', sources: ['Face Reality'] }]);
  });

  test('ignores results sent by the app and analyzes the text itself', async () => {
    // A modified app could send made-up results; they're never read
    await createProduct(USER, { ...product, flagged: [], ingredients: [] });

    expect(SavedProduct.create.mock.calls[0][0].flagged).toHaveLength(1);
  });

  test('leaves out an empty brand and category', async () => {
    await createProduct(USER, { ...product, brand: '', category: '' });

    const saved = SavedProduct.create.mock.calls[0][0];
    expect(saved.brand).toBeUndefined();
    expect(saved.category).toBeUndefined();
  });

  test.each([
    ['missing', undefined, 'Ingredient list is missing.'],
    ['empty', '   ', 'Ingredient list is missing.'],
    ['too long', 'a'.repeat(10001), 'Ingredient list is too long (max 10000 characters).'],
  ])('rejects ingredient text that is %s', async (_, rawText, message) => {
    await expect(createProduct(USER, { ...product, rawText })).rejects.toMatchObject({
      status: 400,
      message,
    });
    expect(SavedProduct.create).not.toHaveBeenCalled();
  });

  test('rejects text with no ingredients in it', async () => {
    analyzeIngredientText.mockResolvedValue({ ingredients: [], flagged: [] });

    await expect(createProduct(USER, product)).rejects.toMatchObject({ status: 400 });
    expect(SavedProduct.create).not.toHaveBeenCalled();
  });
});

describe('duplicates (same name and brand)', () => {
  const product = { productName: ' Night Cream ', brand: 'Acme', rawText: 'Water' };
  const existing = {
    _id: OTHER_ID,
    id: OTHER_ID.toString(),
    productName: 'night cream',
    brand: 'ACME',
    createdAt: new Date('2026-10-01'),
  };

  test('looks for the user’s own products only, ignoring capitals and spaces', async () => {
    await createProduct(USER, product);

    expect(SavedProduct.findOne).toHaveBeenCalledWith({
      user: USER,
      productName: 'Night Cream',
      brand: 'Acme',
    });
    // "strength: 2" compares letters and accents but not upper/lower case
    const lookup = SavedProduct.findOne.mock.results[0].value;
    expect(lookup.collation).toHaveBeenCalledWith({ locale: 'en', strength: 2 });
  });

  test('a product with no brand only matches others with no brand', async () => {
    await createProduct(USER, { productName: 'Night Cream', rawText: 'Water' });

    expect(SavedProduct.findOne.mock.calls[0][0].brand).toBeNull();
  });

  test('asks what to do (409) with the existing product’s details, and saves nothing', async () => {
    SavedProduct.findOne.mockReturnValue(query(existing));

    await expect(createProduct(USER, product)).rejects.toMatchObject({
      status: 409,
      details: {
        duplicate: {
          id: existing.id,
          productName: 'night cream',
          brand: 'ACME',
          createdAt: existing.createdAt,
        },
      },
    });
    expect(SavedProduct.create).not.toHaveBeenCalled();
  });

  test('"keep" saves both, without looking for a duplicate', async () => {
    await createProduct(USER, { ...product, onDuplicate: 'keep' });

    expect(SavedProduct.findOne).not.toHaveBeenCalled();
    expect(SavedProduct.create).toHaveBeenCalled();
    expect(SavedProduct.deleteOne).not.toHaveBeenCalled();
  });

  test('"replace" saves the new product first, then deletes the old one (the user’s own)', async () => {
    SavedProduct.findOne.mockReturnValue(query(existing));
    const order = [];
    SavedProduct.create.mockImplementation(async (fields) => {
      order.push('create');
      return fields;
    });
    SavedProduct.deleteOne.mockImplementation(async () => order.push('delete'));

    await createProduct(USER, { ...product, onDuplicate: 'replace' });

    // A failed save must never lose the old product
    expect(order).toEqual(['create', 'delete']);
    expect(SavedProduct.deleteOne).toHaveBeenCalledWith({ _id: OTHER_ID, user: USER });
  });

  test('rejects an unknown onDuplicate choice', async () => {
    await expect(createProduct(USER, { ...product, onDuplicate: 'merge' })).rejects.toMatchObject({
      status: 400,
    });
  });

  test('when renaming, the product itself doesn’t count as a duplicate', async () => {
    const current = { _id: new mongoose.Types.ObjectId(), productName: 'Old Name', brand: 'Acme' };
    SavedProduct.findOne
      .mockReturnValueOnce(query(current)) // the product being edited
      .mockReturnValueOnce(query(null)); // no other product with the new name
    SavedProduct.findOneAndUpdate.mockResolvedValue({ id: PRODUCT_ID });

    await updateProduct(USER, PRODUCT_ID, { productName: 'Night Cream' });

    const duplicateQuery = SavedProduct.findOne.mock.calls[1][0];
    expect(duplicateQuery).toMatchObject({ user: USER, productName: 'Night Cream', brand: 'Acme' });
    expect(duplicateQuery._id).toEqual({ $ne: current._id });
  });

  test('renaming to match another product asks what to do (409) and changes nothing', async () => {
    const current = { _id: new mongoose.Types.ObjectId(), productName: 'Old Name', brand: 'Acme' };
    SavedProduct.findOne
      .mockReturnValueOnce(query(current))
      .mockReturnValueOnce(query(existing));

    await expect(
      updateProduct(USER, PRODUCT_ID, { productName: 'Night Cream' })
    ).rejects.toMatchObject({ status: 409 });
    expect(SavedProduct.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('editing a product', () => {
  beforeEach(() => {
    SavedProduct.findOneAndUpdate.mockResolvedValue({ id: PRODUCT_ID });
  });

  test('changes only the name, brand and category, ignoring anything else sent', async () => {
    await updateProduct(USER, PRODUCT_ID, {
      category: 'serum',
      // Not passed on by the controller, but even if they were: ignored
      user: 'someone-else',
      flagged: [],
    });

    const [, update, options] = SavedProduct.findOneAndUpdate.mock.calls[0];
    expect(update).toEqual({ $set: { category: 'serum' } });
    // The schema's rules (name rule, category list) apply to edits too
    expect(options).toMatchObject({ runValidators: true });
  });

  test.each([
    ['an empty brand', { brand: '' }, { $unset: { brand: '' } }],
    ['a null category', { category: null }, { $unset: { category: '' } }],
  ])('removes a field when sent %s', async (_, changes, expected) => {
    // A brand change looks for duplicates first
    SavedProduct.findOne
      .mockReturnValueOnce(query({ _id: OTHER_ID, productName: 'Night Cream' }))
      .mockReturnValueOnce(query(null));

    await updateProduct(USER, PRODUCT_ID, changes);

    expect(SavedProduct.findOneAndUpdate.mock.calls[0][1]).toEqual(expected);
  });

  test('rejects an edit with nothing to change', async () => {
    await expect(updateProduct(USER, PRODUCT_ID, {})).rejects.toMatchObject({
      status: 400,
      message: 'Nothing to update.',
    });
  });
});
