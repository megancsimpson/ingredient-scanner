const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadIngredients } = require('../seed/seedIngredients');
const { normalizeIngredient } = require('../utils/normalize');

const DATA_FILE = path.join(__dirname, '..', 'seed', 'data', 'ingredients.json');

// Writes a small ingredient list to a temporary file and loads it, the way
// the seed script loads the real one
let tempDir;
beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-test-'));
});
afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

function load(entries) {
  const file = path.join(tempDir, `list-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(entries));
  return loadIngredients(file);
}

describe('loadIngredients', () => {
  test('normalizes each name for matching and keeps the display name', () => {
    const [ingredient] = load([{ name: '  D&C Red 17 ', sources: ['Face Reality'] }]);
    expect(ingredient).toEqual({
      name: 'D&C Red 17',
      normalized: 'd c red 17',
      aliases: [],
      sources: ['Face Reality'],
    });
  });

  test('works out "normalized" itself, ignoring an out-of-date one in the file', () => {
    const [ingredient] = load([{ name: 'Coconut Oil', normalized: 'something old' }]);
    expect(ingredient.normalized).toBe('coconut oil');
  });

  test('accepts plain strings as well as objects', () => {
    const [ingredient] = load(['Shea Butter']);
    expect(ingredient).toMatchObject({ name: 'Shea Butter', normalized: 'shea butter', sources: [] });
  });

  test('merges entries that normalize to the same name, combining their sources', () => {
    const ingredients = load([
      { name: 'D&C Red 17', sources: ['Acne Clinic NYC'] },
      { name: 'D & C Red # 17', sources: ['Face Reality', 'Acne Clinic NYC'] },
    ]);
    expect(ingredients).toHaveLength(1);
    // The first spelling is the one shown in the app
    expect(ingredients[0].name).toBe('D&C Red 17');
    expect(ingredients[0].sources).toEqual(['Acne Clinic NYC', 'Face Reality']);
  });

  test('normalizes aliases and drops empty ones', () => {
    const [ingredient] = load([{ name: 'Algae Extract', aliases: ['Seaweed Extract', '---', ''] }]);
    expect(ingredient.aliases).toEqual(['seaweed extract']);
  });

  test('keeps notes only when the list has them', () => {
    const [withNotes, without] = load([
      { name: 'Coconut', notes: 'Keyword: flags any ingredient containing it' },
      { name: 'Shea' },
    ]);
    expect(withNotes.notes).toBe('Keyword: flags any ingredient containing it');
    expect(without).not.toHaveProperty('notes');
  });

  test('skips names that are only punctuation', () => {
    expect(load([{ name: '---' }, { name: 'Coconut' }])).toHaveLength(1);
  });

  test.each([
    ['an entry with no name', [{ sources: ['Face Reality'] }], 'Entry 0 is missing a name'],
    ['an empty entry', ['Coconut', null], 'Entry 1 is missing a name'],
    ['a file that isn’t a list', { name: 'Coconut' }, 'must contain an array'],
  ])('stops with a clear error for %s', (_, entries, message) => {
    expect(() => load(entries)).toThrow(message);
  });
});

// Checks on the real list in seed/data/ingredients.json, so a mistake when
// editing it is caught before it reaches the database
describe('the ingredient list', () => {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const loaded = loadIngredients(DATA_FILE);

  test('loads without errors and has no duplicate names', () => {
    // Every entry survives: none were merged into another
    expect(loaded).toHaveLength(raw.length);
  });

  test('has at least as many ingredients as the estheticians’ list (358)', () => {
    // Raise this number when ingredients are added
    expect(loaded.length).toBeGreaterThanOrEqual(358);
  });

  test('every ingredient comes from one of the known source lists', () => {
    const knownSources = ['Acne Clinic NYC', 'Face Reality'];
    for (const ingredient of loaded) {
      expect(ingredient.sources.length).toBeGreaterThan(0);
      for (const source of ingredient.sources) expect(knownSources).toContain(source);
    }
  });

  test('every "normalized" in the file matches the name', () => {
    // The seed script works it out again anyway, but a mismatch means the
    // file was edited by hand and is worth a look
    const mismatched = raw.filter((entry) => entry.normalized !== normalizeIngredient(entry.name));
    expect(mismatched).toEqual([]);
  });
});
