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
 * The user's most recent saved product with the same name and brand, or
 * null. Capitals and spaces at either end are ignored, so "Night Cream" by
 * "Acme" matches "night cream " by "ACME". A product with no brand only
 * matches another with no brand.
 *
 * excludeId leaves out one product: when editing, the product being edited
 * isn't a duplicate of itself.
 */
async function findDuplicate(userId, productName, brand, excludeId) {
  const name = typeof productName === 'string' ? productName.trim() : '';
  if (!name) return null;
  const trimmedBrand = typeof brand === 'string' ? brand.trim() : '';

  return (
    SavedProduct.findOne({
      user: userId,
      productName: name,
      // { brand: null } matches products saved without a brand
      brand: trimmedBrand || null,
      ...(excludeId && { _id: { $ne: excludeId } }),
    })
      // Compare ignoring capitals ("strength: 2" means letters and accents
      // count, but not upper/lower case)
      .collation({ locale: 'en', strength: 2 })
      .sort({ createdAt: -1 })
  );
}

/**
 * Rejects any field that was sent as something other than text, e.g. an
 * object like { "$ne": "" }. Requests come from the app, but anyone can send
 * their own, and an object in the wrong place can trick a database query
 * into matching things it shouldn't ("NoSQL injection"). Checking the type
 * here, before anything reaches the database, stops that. null and
 * undefined are allowed: they mean "not sent" or "remove it".
 */
function checkTextFields(fields) {
  for (const [label, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      throw new HttpError(400, `${label} must be text.`);
    }
  }
}

// What the app can ask for when a product with the same name and brand is
// already saved
const DUPLICATE_OPTIONS = ['replace', 'keep'];

function checkDuplicateOption(onDuplicate) {
  if (onDuplicate !== undefined && !DUPLICATE_OPTIONS.includes(onDuplicate)) {
    throw new HttpError(400, 'onDuplicate must be "replace" or "keep".');
  }
}

/**
 * The 409 sent when a duplicate is found. The app shows the existing
 * product's details and asks whether to replace it or keep both.
 */
function duplicateError(duplicate) {
  return new HttpError(409, 'You already have a product with this name saved.', {
    duplicate: {
      id: duplicate.id,
      productName: duplicate.productName,
      brand: duplicate.brand,
      createdAt: duplicate.createdAt,
    },
  });
}

/**
 * Saves a product for the user.
 *
 * The app sends the ingredient text, not the results: the server analyzes
 * it again here, so saved results always come from the server and can't be
 * made up by a modified app. It's the same analysis /api/analyze ran, so
 * the user sees the same results they just looked at.
 *
 * If the user already has a product with the same name and brand, this
 * throws a 409 with the existing product's details, unless onDuplicate says
 * what to do:
 *   'replace': save the new product and delete the old one
 *   'keep':    save the new product as well
 */
async function createProduct(
  userId,
  { productName, brand, category, rawText, source, onDuplicate }
) {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    throw new HttpError(400, 'Ingredient list is missing.');
  }
  if (rawText.length > MAX_TEXT_LENGTH) {
    throw new HttpError(400, `Ingredient list is too long (max ${MAX_TEXT_LENGTH} characters).`);
  }
  checkTextFields({ 'Product name': productName, Brand: brand, Category: category, Source: source });
  checkDuplicateOption(onDuplicate);

  const duplicate = onDuplicate === 'keep' ? null : await findDuplicate(userId, productName, brand);
  if (duplicate && onDuplicate === undefined) throw duplicateError(duplicate);

  const { ingredients, flagged } = await analyzeIngredientText(rawText);
  if (ingredients.length === 0) {
    throw new HttpError(400, "Couldn't find any ingredients in that text.");
  }

  // Mongoose validates productName, brand, category and source
  // (models/SavedProduct.js).
  // Database IDs in "matches" aren't stored: the snapshot shouldn't point
  // at ingredients that might be changed or removed later.
  const product = await SavedProduct.create({
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

  // Replacing: delete the old product only once the new one is saved, so a
  // failed save never loses the old one
  if (duplicate && onDuplicate === 'replace') {
    await SavedProduct.deleteOne({ _id: duplicate._id, user: userId });
  }

  return product;
}

/**
 * Changes a saved product's name, brand and/or category, if it belongs to
 * the user. Only these fields can be edited; the results stay as they were
 * saved. An empty or null brand or category removes it.
 *
 * If the new name and brand match another saved product, this throws a 409
 * like createProduct, unless onDuplicate says what to do:
 *   'replace': save the edit and delete the other product
 *   'keep':    save the edit and keep both
 */
async function updateProduct(userId, productId, { productName, brand, category, onDuplicate }) {
  if (!mongoose.isValidObjectId(productId)) throw notFound();
  checkTextFields({ 'Product name': productName, Brand: brand, Category: category });
  checkDuplicateOption(onDuplicate);

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

  // Only a new name or brand can create a duplicate
  let duplicate = null;
  if ((productName !== undefined || brand !== undefined) && onDuplicate !== 'keep') {
    const current = await SavedProduct.findOne({ _id: productId, user: userId });
    if (!current) throw notFound();
    // The name and brand the product will have after this edit
    const newName = productName !== undefined ? productName : current.productName;
    const newBrand = brand !== undefined ? brand : current.brand;
    duplicate = await findDuplicate(userId, newName, newBrand, current._id);
    if (duplicate && onDuplicate === undefined) throw duplicateError(duplicate);
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

  // Replacing: delete the other product only once the edit is saved
  if (duplicate && onDuplicate === 'replace') {
    await SavedProduct.deleteOne({ _id: duplicate._id, user: userId });
  }

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
