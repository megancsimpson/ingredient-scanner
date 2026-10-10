import { StyleSheet, Text, View } from 'react-native';

/**
 * The full parsed ingredient list, with flagged ingredients highlighted.
 *
 * @param {{
 *   ingredients: { name: string, normalized: string }[],
 *   flaggedNames?: string[],      normalized names of flagged ingredients
 * }} props
 */
export default function IngredientList({ ingredients, flaggedNames = [] }) {
  const flagged = new Set(flaggedNames);

  return (
    <View>
      {ingredients.map((ingredient) => {
        const isFlagged = flagged.has(ingredient.normalized);
        return (
          <Text
            key={ingredient.normalized}
            style={[styles.item, isFlagged && styles.flagged]}
            // Screen readers can't see the red color, so say it in words
            accessibilityLabel={isFlagged ? `${ingredient.name}, flagged` : ingredient.name}
          >
            {isFlagged ? '⚑ ' : '• '}
            {ingredient.name}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { fontSize: 15, color: '#333', paddingVertical: 3 },
  flagged: { color: '#c0392b', fontWeight: '600' },
});
