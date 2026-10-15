const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const { normalizeIngredient } = require('../utils/normalize');
const { searchIngredients, getIngredient } = require('../services/ingredientService');

// A small ingredient list, built as real Ingredient documents (so they have
// IDs like the database's) but never saved
const LIST = [
  'Coconut',
  'Coconut Oil',
  'Cocos Nucifera',
  'Isopropyl Myristate',
  'Laureth 4',
  'Myristate',
  'Shea Butter',
].map((name) => new Ingredient({ name, normalized: normalizeIngredient(name), sources: ['Face Reality'] }));

// An ingredient with an alias, like "Algae" also listed as "seaweed"
LIST.push(
  new Ingredient({ name: 'Algae Extract', normalized: 'algae extract', aliases: ['seaweed extract'] })
);

// Stand in for Ingredient.find().sort().collation(), which loads the list
beforeEach(() => {
  const chain = { sort: () => chain, collation: () => Promise.resolve(LIST) };
  jest.spyOn(Ingredient, 'find').mockReturnValue(chain);
});

afterEach(() => jest.restoreAllMocks());

const names = (ingredients) => ingredients.map((ingredient) => ingredient.name);

describe('searchIngredients', () => {
  test.each([[''], ['   '], [undefined], [{ $ne: '' }]])(
    'returns the whole list for an empty or non-text search (%p)',
    async (search) => {
      expect(await searchIngredients(search)).toHaveLength(LIST.length);
    }
  );

  test('finds names that contain the search, ignoring capitals', async () => {
    expect(names(await searchIngredients('MYRI'))).toEqual(['Isopropyl Myristate', 'Myristate']);
  });

  test('finds ingredients by an alias', async () => {
    expect(names(await searchIngredients('seaweed'))).toEqual(['Algae Extract']);
  });

  test('finds the entries that would flag a full label name', async () => {
    // The scanner's rule: these entries are whole words inside the name
    expect(names(await searchIngredients('Cocos Nucifera (Coconut) Oil'))).toEqual([
      'Coconut',
      'Coconut Oil',
      'Cocos Nucifera',
    ]);
  });

  test('uses whole words, like the scanner, so "Laureth 40" doesn’t find "Laureth 4"', async () => {
    expect(names(await searchIngredients('Laureth 40'))).toEqual([]);
  });

  test('ignores punctuation, like the scanner', async () => {
    expect(names(await searchIngredients('shea-butter'))).toEqual(['Shea Butter']);
  });

  test('rejects a search over 200 characters', async () => {
    await expect(searchIngredients('a'.repeat(201))).rejects.toMatchObject({ status: 400 });
  });
});

describe('getIngredient', () => {
  test('gives a 404 for an invalid ID without asking the database', async () => {
    const findById = jest.spyOn(Ingredient, 'findById');

    await expect(getIngredient('not-an-id')).rejects.toMatchObject({ status: 404 });
    expect(findById).not.toHaveBeenCalled();
  });

  test('gives a 404 when the ingredient doesn’t exist', async () => {
    jest.spyOn(Ingredient, 'findById').mockResolvedValue(null);

    await expect(getIngredient(new mongoose.Types.ObjectId().toString())).rejects.toMatchObject({
      status: 404,
      message: 'Ingredient not found.',
    });
  });
});
