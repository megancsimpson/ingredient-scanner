import { CATEGORIES, getCategoryLabel } from './categories';

/** The ways the Saved list can be organized, in the order they're shown */
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'brand', label: 'Brand' },
  { value: 'category', label: 'Category' },
  // A filter rather than a sort: only products with no flagged ingredients
  { value: 'clear', label: 'Non pore-clogging' },
];

// Compares text the way people expect: ignoring capitals and accents, and
// with numbers in order ("Cream 2" before "Cream 10")
const compareText = (a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
const byName = (a, b) => compareText(a.productName, b.productName);

/**
 * Sorts and groups saved products for a SectionList: an array of
 * { title, data } sections. Lists that aren't grouped are one section with
 * no title.
 *
 *   newest:   newest first
 *   name:     A to Z
 *   brand:    grouped by brand (A to Z), "No brand" last; names A to Z
 *   category: grouped in the category list's order, "No category" last;
 *             newest first within each
 *   clear:    only products with no flagged ingredients, newest first
 *             (an empty array if there are none)
 *
 * @param {{ productName: string, brand?: string, category?: string, createdAt: string,
 *           flagged: object[] }[]} products
 * @param {'newest' | 'name' | 'brand' | 'category' | 'clear'} sortBy
 * @returns {{ title: string | null, data: object[] }[]}
 */
export function organizeProducts(products, sortBy) {
  if (products.length === 0) return [];

  if (sortBy === 'name') return [{ title: null, data: [...products].sort(byName) }];

  if (sortBy === 'clear') {
    const clear = products.filter((product) => product.flagged.length === 0).sort(newestFirst);
    return clear.length > 0 ? [{ title: null, data: clear }] : [];
  }

  if (sortBy === 'brand') {
    // Group case-insensitively, so "acme" and "Acme" end up together; the
    // heading uses the first spelling found
    const groups = groupBy(products, (product) => product.brand?.trim().toLowerCase() || null);
    const sections = [...groups.values()]
      .filter((group) => group.key !== null)
      .map((group) => ({ title: group.items[0].brand.trim(), data: group.items.sort(byName) }))
      .sort((a, b) => compareText(a.title, b.title));
    const noBrand = groups.get(null);
    if (noBrand) sections.push({ title: 'No brand', data: noBrand.items.sort(byName) });
    return sections;
  }

  if (sortBy === 'category') {
    const groups = groupBy(products, (product) => product.category || null);
    const sections = CATEGORIES.filter((category) => groups.has(category.value)).map(
      (category) => ({
        title: getCategoryLabel(category.value),
        data: groups.get(category.value).items.sort(newestFirst),
      })
    );
    const noCategory = groups.get(null);
    if (noCategory) sections.push({ title: 'No category', data: noCategory.items.sort(newestFirst) });
    return sections;
  }

  // 'newest' (the default)
  return [{ title: null, data: [...products].sort(newestFirst) }];
}

/**
 * Puts items into groups by the key that getKey returns for each.
 * @returns {Map<any, { key: any, items: object[] }>}
 */
function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, { key, items: [] });
    groups.get(key).items.push(item);
  }
  return groups;
}
