const mongoose = require('mongoose');
const SavedProduct = require('../models/SavedProduct');
const Ingredient = require('../models/Ingredient');

/**
 * What the API sends for each kind of document. Express turns documents
 * into JSON with toJSON(), so these check what the app (and anyone
 * watching the requests) gets to see. No database is needed: the documents
 * are only built in memory.
 */

describe('a saved product as the API sends it', () => {
  const owner = new mongoose.Types.ObjectId();
  const product = new SavedProduct({
    user: owner,
    productName: 'Night Cream',
    brand: 'Acme',
    rawText: 'Water, Coconut Oil',
    ingredients: [{ name: 'Water', normalized: 'water' }],
  });
  const json = JSON.parse(JSON.stringify(product));

  test('has "id" as text instead of MongoDB\'s "_id"', () => {
    expect(json.id).toBe(product._id.toString());
    expect(json).not.toHaveProperty('_id');
    expect(json).not.toHaveProperty('__v');
  });

  test("never includes the owner's user ID", () => {
    expect(json).not.toHaveProperty('user');
    expect(JSON.stringify(json)).not.toContain(owner.toString());
  });

  test('keeps the fields the app shows', () => {
    expect(json).toMatchObject({
      productName: 'Night Cream',
      brand: 'Acme',
      rawText: 'Water, Coconut Oil',
      ingredients: [{ name: 'Water', normalized: 'water' }],
      flagged: [],
      source: 'paste',
    });
  });
});

describe('an ingredient as the API sends it', () => {
  const ingredient = new Ingredient({
    name: 'Coconut Oil',
    normalized: 'coconut oil',
    aliases: ['cocos nucifera oil'],
    sources: ['Face Reality'],
    notes: 'A note',
  });
  // Timestamps are only set when saving, so set them as the database would
  ingredient.createdAt = new Date();
  ingredient.updatedAt = new Date();
  const json = JSON.parse(JSON.stringify(ingredient));

  test('has exactly { id, name, aliases, sources, notes }', () => {
    // "normalized" is only for matching, and the dates and MongoDB's own
    // fields aren't useful to the app
    expect(json).toEqual({
      id: ingredient._id.toString(),
      name: 'Coconut Oil',
      aliases: ['cocos nucifera oil'],
      sources: ['Face Reality'],
      notes: 'A note',
    });
  });
});
