const mongoose = require('mongoose');
const SavedProduct = require('../models/SavedProduct');
const HttpError = require('../utils/httpError');
const { analyzeIngredientText } = require('./analysisService');

// Same limit as /api/analyze (controllers/analyzeController.js)
const MAX_TEXT_LENGTH = 10000;

// Every query below includes the user's ID as well as the product's ID, so
// one user can never read or delete another user's products. A product that
// exists but belongs to someone else gets the same 404 as one that doesn't
// exist, so the response doesn't reveal that it's there.
const notFound = () => new HttpError(404, 'Product not found.');

/**
 * The user's saved products, newest first.
 * Leaves out the ingredient text and full ingredient list, which the list
 * screen doesn't need; getProduct() returns everything.
 */
async function listProducts(userId) {
  return SavedProduct.find({ user: userId }, '-rawText -ingredients').sort({ createdAt: -1 });
}

/**
 * One saved product, if it belongs to the user.
 */
async function getProduct(userId, productId) {
  // An ID that isn't a valid ObjectId would make Mongoose throw a CastError
  if (!mongoose.isValidObjectId(productId)) throw notFound();

  const product = await SavedProduct.findOne({ _id: productId, user: userId });
  if (!product) throw notFound();
  return product;
}

/**
 * Saves a product for the user.
 *
 * The app sends the ingredient text, not the results: the server analyzes
 * it again here, so saved results always come from the server and can't be
 * made up by a modified app. It's the same analysis /api/analyze ran, so
 * the user sees the same results they just looked at.
 */
async function createProduct(userId, { productName, brand, category, rawText, source }) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    throw new HttpError(400, 'Ingredient list is missing.');
  }
  if (rawText.length > MAX_TEXT_LENGTH) {
    throw new HttpError(400, `Ingredient list is too long (max ${MAX_TEXT_LENGTH} characters).`);
  }

  const { ingredients, flagged } = await analyzeIngredientText(rawText);
  if (ingredients.length === 0) {
    throw new HttpError(400, "Couldn't find any ingredients in that text.");
  }

  // Mongoose validates productName, brand, category and source
  // (models/SavedProduct.js).
  // Database IDs in "matches" aren't stored: the snapshot shouldn't point
  // at ingredients that might be changed or removed later.
  return SavedProduct.create({
    user: userId,
    productName,
    // Leave optional fields out entirely when empty
    brand: brand || undefined,
    category: category || undefined,
    rawText,
    ingredients,
    flagged: flagged.map(({ name, normalized, sources, matches }) => ({
      name,
      normalized,
      sources,
      matches: matches.map((match) => ({ name: match.name, sources: match.sources })),
    })),
    source,
  });
}

/**
 * Changes a saved product's name, brand and/or category, if it belongs to
 * the user. Only these fields can be edited; the results stay as they were
 * saved. An empty or null brand or category removes it.
 */
async function updateProduct(userId, productId, { productName, brand, category }) {
  if (!mongoose.isValidObjectId(productId)) throw notFound();

  // Only change the fields that were sent, and ignore anything else in the
  // request (e.g. "user" or "flagged") so those can't be changed
  const set = {};
  const unset = {};
  if (productName !== undefined) set.productName = productName;
  for (const [field, value] of Object.entries({ brand, category })) {
    if (value === undefined) continue; // not sent: leave as is
    if (value === null || (typeof value === 'string' && value.trim() === '')) unset[field] = '';
    else set[field] = value;
  }

  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    throw new HttpError(400, 'Nothing to update.');
  }

  const product = await SavedProduct.findOneAndUpdate(
    { _id: productId, user: userId },
    // Leave out an empty $set or $unset, which older MongoDB versions reject
    {
      ...(Object.keys(set).length > 0 && { $set: set }),
      ...(Object.keys(unset).length > 0 && { $unset: unset }),
    },
    // Return the updated product, and check it against the schema rules
    // (required name, max lengths, category list) like a new product would be
    { returnDocument: 'after', runValidators: true }
  );
  if (!product) throw notFound();
  return product;
}

/**
 * Deletes one saved product, if it belongs to the user.
 */
async function deleteProduct(userId, productId) {
  if (!mongoose.isValidObjectId(productId)) throw notFound();

  const deleted = await SavedProduct.findOneAndDelete({ _id: productId, user: userId });
  if (!deleted) throw notFound();
}

/**
 * Deletes all of a user's saved products (used when deleting an account).
 */
async function deleteAllForUser(userId) {
  await SavedProduct.deleteMany({ user: userId });
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteAllForUser,
};
