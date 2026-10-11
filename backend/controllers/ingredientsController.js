const ingredientService = require('../services/ingredientService');

/**
 * GET /api/ingredients?search=
 * Response: 200 { ingredients: [...] } A to Z; all of them if search is empty
 *           400 if the search is too long
 */
async function search(req, res) {
  const ingredients = await ingredientService.searchIngredients(req.query.search);
  res.json({ ingredients });
}

/**
 * GET /api/ingredients/:id
 * Response: 200 { ingredient }, 404 if it doesn't exist
 */
async function getOne(req, res) {
  const ingredient = await ingredientService.getIngredient(req.params.id);
  res.json({ ingredient });
}

module.exports = { search, getOne };
