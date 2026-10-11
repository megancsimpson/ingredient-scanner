/**
 * Product categories: the code saved on the server and the name shown in
 * the app. The codes must match PRODUCT_CATEGORIES in
 * backend/models/SavedProduct.js; the server rejects any other code.
 * The order here is the order they appear in the app.
 */
export const CATEGORIES = [
  { value: 'cleanser', label: 'Cleanser' },
  { value: 'toner', label: 'Toner' },
  { value: 'astringent', label: 'Astringent' },
  { value: 'exfoliant', label: 'Exfoliant' },
  { value: 'serum', label: 'Serum' },
  { value: 'retinoid', label: 'Retinoid' },
  { value: 'moisturizer', label: 'Moisturizer' },
  { value: 'eye', label: 'Eye care' },
  { value: 'lip', label: 'Lip care' },
  { value: 'sunscreen', label: 'Sunscreen' },
  { value: 'mask', label: 'Mask' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'hair', label: 'Hair care' },
  { value: 'body', label: 'Body care' },
  { value: 'detergent', label: 'Detergent' },
  { value: 'other', label: 'Other' },
];

/**
 * The display name for a category code.
 *   getCategoryLabel('eye') -> 'Eye care'
 *   getCategoryLabel(undefined) -> ''
 */
export function getCategoryLabel(value) {
  return CATEGORIES.find((category) => category.value === value)?.label ?? '';
}
