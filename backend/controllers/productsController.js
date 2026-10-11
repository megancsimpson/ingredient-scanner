const productService = require('../services/productService');

// All routes are logged in (routes/products.js), so req.user is always set.
// The user comes from the token, never from the request.

/**
 * GET /api/products
 * Response: 200 { products: [...] } newest first, without rawText and ingredients
 */
async function list(req, res) {
  const products = await productService.listProducts(req.user._id);
  res.json({ products });
}

/**
 * GET /api/products/:id
 * Response: 200 { product }, 404 if it doesn't exist or isn't the user's
 */
async function getOne(req, res) {
  const product = await productService.getProduct(req.user._id, req.params.id);
  res.json({ product });
}

/**
 * POST /api/products
 * Body:     { productName, brand?, category?, rawText, source? ('photo' | 'paste') }
 * Response: 201 { product }, 400 invalid input
 */
async function create(req, res) {
  const { productName, brand, category, rawText, source } = req.body || {};
  const product = await productService.createProduct(req.user._id, {
    productName,
    brand,
    category,
    rawText,
    source,
  });
  res.status(201).json({ product });
}

/**
 * PATCH /api/products/:id
 * Body:     { productName?, brand?, category? } (only the fields being changed;
 *           null or "" removes brand or category)
 * Response: 200 { product }, 400 invalid input, 404 if it isn't the user's
 */
async function update(req, res) {
  const { productName, brand, category } = req.body || {};
  const product = await productService.updateProduct(req.user._id, req.params.id, {
    productName,
    brand,
    category,
  });
  res.json({ product });
}

/**
 * DELETE /api/products/:id
 * Response: 204 (no body), 404 if it doesn't exist or isn't the user's
 */
async function remove(req, res) {
  await productService.deleteProduct(req.user._id, req.params.id);
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
