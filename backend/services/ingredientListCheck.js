/**
 * Guesses whether parsed text is really an ingredient list, so the app can
 * warn when someone pastes or types something else ("hello world", a
 * product review, a website's description).
 *
 * It's only a guess: the app knows the pore-clogging ingredients, not every
 * ingredient there is. So it looks for what ingredient names usually have:
 * common ingredient words ("oil", "extract", "sodium"), chemical-style
 * endings ("-ate", "-ide", "-ol"), or numbers ("CI 77491", "PEG-100"). The
 * app only warns and lets the user carry on, so a wrong guess never blocks
 * a real list.
 *
 * This is a pure function, tested in tests/ingredientListCheck.test.js.
 */

// Words found in many ingredient names (compared in normalized form)
const INGREDIENT_WORDS = new Set([
  // Bases and plant parts
  'water', 'aqua', 'eau', 'oil', 'oils', 'extract', 'butter', 'wax', 'juice', 'leaf', 'seed',
  'root', 'flower', 'fruit', 'peel', 'bark', 'kernel', 'stem', 'gum', 'resin', 'starch',
  'powder', 'ferment', 'filtrate', 'lysate', 'protein', 'sugar', 'honey', 'milk', 'salt',
  'clay', 'mica', 'silica', 'talc', 'kaolin', 'aloe', 'shea', 'cocoa', 'jojoba', 'argan',
  'vera', 'tea',
  // Chemistry
  'acid', 'alcohol', 'glycol', 'glycerin', 'glycerine', 'sodium', 'potassium', 'calcium',
  'magnesium', 'zinc', 'titanium', 'iron', 'oxide', 'oxides', 'dioxide', 'hydroxide',
  'hydrolyzed', 'hydrogenated', 'ester', 'esters', 'peg', 'ppg', 'ci', 'polymer',
  'copolymer', 'crosspolymer', 'vitamin', 'fragrance', 'parfum', 'aroma', 'colorant',
]);

// Chemical-style word endings ("stearate", "chloride", "tocopherol",
// "dimethicone", "squalane"). Only checked on words of 5 or more letters,
// so short everyday words like "one" and "line" don't count.
const INGREDIENT_ENDINGS = /(?:ate|ide|ite|ol|one|ene|ine|ane|yl|ium|ose|ic|in|ein)$/;

// A real ingredient name is rarely this long; a sentence often is
const MAX_WORDS = 8;

/**
 * Whether one parsed ingredient looks like a real ingredient name.
 * @param {{ normalized: string }} ingredient
 */
function looksLikeIngredient(ingredient) {
  const words = ingredient.normalized.split(' ').filter(Boolean);
  if (words.length === 0 || words.length > MAX_WORDS) return false;
  return words.some(
    (word) =>
      INGREDIENT_WORDS.has(word) ||
      /\d/.test(word) ||
      (word.length >= 5 && INGREDIENT_ENDINGS.test(word))
  );
}

/**
 * Whether a parsed list looks like an ingredient list: at least half its
 * items look like ingredients. Flagged items always count, since they
 * matched the database.
 *
 * @param {{ normalized: string }[]} parsed   from parseIngredients()
 * @param {{ normalized: string }[]} flagged  from matchIngredients()
 * @returns {boolean}
 */
function looksLikeIngredientList(parsed, flagged = []) {
  if (parsed.length === 0) return false;
  const flaggedNames = new Set(flagged.map((item) => item.normalized));
  const likely = parsed.filter(
    (ingredient) => flaggedNames.has(ingredient.normalized) || looksLikeIngredient(ingredient)
  ).length;
  return likely * 2 >= parsed.length;
}

module.exports = { looksLikeIngredientList, looksLikeIngredient };
