/**
 * Compares a parsed ingredient list against the pore-clogging ingredients
 * from the database and returns the ones that should be flagged.
 *
 * This is a pure function: the caller loads the database ingredients and
 * passes them in, so it can be tested without a database
 * (see tests/ingredientMatcher.test.js).
 *
 * Matching rule: an ingredient is flagged when any of its variants contains
 * a database name or alias as whole words. So a keyword like "Coconut" flags
 * "Cocos Nucifera (Coconut) Oil" and "Coconut Alkanes", and "Isopropyl
 * Myristate" in the database flags "Isopropyl Myristate" on a label.
 * Whole words only: "Laureth 4" does not flag "Laureth 40".
 *
 * Example:
 *   matchIngredients(
 *     parseIngredients('Water, Cocos Nucifera (Coconut) Oil'),
 *     [{ _id: '1', name: 'Coconut', normalized: 'coconut', aliases: [], sources: ['Face Reality'] }]
 *   )
 *   -> [
 *        { name: 'Cocos Nucifera (Coconut) Oil',
 *          normalized: 'cocos nucifera coconut oil',
 *          sources: ['Face Reality'],
 *          matches: [{ _id: '1', name: 'Coconut', sources: ['Face Reality'] }] },
 *      ]
 *
 * @param {{ name: string, normalized: string, variants: string[] }[]} parsedIngredients
 *   output of parseIngredients()
 * @param {{ _id?: any, name: string, normalized: string, aliases?: string[], sources?: string[] }[]} dbIngredients
 *   Ingredient documents (plain objects, e.g. from .lean())
 * @returns {{ name: string, normalized: string, sources: string[],
 *             matches: { _id: any, name: string, sources: string[] }[] }[]}
 *   flagged ingredients, in the order they appear on the label
 */
function matchIngredients(parsedIngredients, dbIngredients) {
  if (!Array.isArray(parsedIngredients) || !Array.isArray(dbIngredients)) return [];

  // Every name each database ingredient can be found under (its normalized
  // name plus any aliases)
  const searchTerms = dbIngredients.map((ingredient) => ({
    ingredient,
    terms: [ingredient.normalized, ...(ingredient.aliases || [])].filter(Boolean),
  }));

  const flagged = [];

  parsedIngredients.forEach((parsed) => {
    const variants = parsed.variants || [parsed.normalized];

    const matches = searchTerms
      .filter(({ terms }) =>
        terms.some((term) => variants.some((variant) => containsWords(variant, term)))
      )
      .map(({ ingredient }) => ({
        _id: ingredient._id,
        name: ingredient.name,
        sources: ingredient.sources || [],
      }));

    if (matches.length === 0) return;

    flagged.push({
      name: parsed.name,
      normalized: parsed.normalized,
      // All the lists that flag this ingredient, without repeats
      sources: [...new Set(matches.flatMap((match) => match.sources))],
      matches,
    });
  });

  return flagged;
}

/**
 * True if `words` appears in `text` as whole words.
 * Both are normalized (lowercase, single spaces), so adding a space on each
 * side means only whole words can line up:
 *   containsWords('isopropyl myristate', 'myristate') -> true
 *   containsWords('laureth 40', 'laureth 4')           -> false
 */
function containsWords(text, words) {
  return ` ${text} `.includes(` ${words} `);
}

module.exports = { matchIngredients };
