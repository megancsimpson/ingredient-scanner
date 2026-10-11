/**
 * Formats a date for display in the user's own language and region.
 *   formatDate('2026-10-10T23:45:34.378Z') -> "Oct 10, 2026" (US English)
 *
 * @param {string | Date} value
 * @returns {string}
 */
export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // "undefined" means the device's language and region settings
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
