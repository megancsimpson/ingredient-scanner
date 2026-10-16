import fs from 'fs';
import path from 'path';
import { CATEGORIES, getCategoryLabel } from '../src/utils/categories';

describe('getCategoryLabel', () => {
  test('gives the display name for a code', () => {
    expect(getCategoryLabel('eye')).toBe('Eye care');
    expect(getCategoryLabel('cleanser')).toBe('Cleanser');
  });

  test('gives an empty string for no category or an unknown code', () => {
    expect(getCategoryLabel(undefined)).toBe('');
    expect(getCategoryLabel('')).toBe('');
    expect(getCategoryLabel('not-a-category')).toBe('');
  });
});

describe('CATEGORIES', () => {
  test('has no repeated codes or names', () => {
    const codes = CATEGORIES.map((c) => c.value);
    const names = CATEGORIES.map((c) => c.label);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(names).size).toBe(names.length);
  });

  test("has the same codes, in the same order, as the server's list", () => {
    // The server rejects any category not in PRODUCT_CATEGORIES in
    // backend/models/SavedProduct.js, and the Saved list leaves out groups
    // it doesn't know, so the two lists must match. The file is read as
    // text, because loading it would need the backend's database library.
    const file = path.join(__dirname, '../../backend/models/SavedProduct.js');
    const source = fs.readFileSync(file, 'utf8');
    const list = source.match(/const PRODUCT_CATEGORIES = \[([^\]]*)\]/);
    expect(list).not.toBeNull();
    const serverCodes = [...list[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

    expect(CATEGORIES.map((c) => c.value)).toEqual(serverCodes);
  });
});
