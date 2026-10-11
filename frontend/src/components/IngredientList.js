import { StyleSheet, Text, View } from 'react-native';
import RemoveButton from './RemoveButton';

/**
 * The full parsed ingredient list, with flagged ingredients highlighted.
 * Pass onRemove to show a × button on each ingredient (edit mode on
 * ResultsScreen).
 *
 * @param {{
 *   ingredients: { name: string, normalized: string }[],
 *   flaggedNames?: string[],      normalized names of flagged ingredients
 *   onRemove?: (normalized: string) => void,
 * }} props
 */
export default function IngredientList({ ingredients, flaggedNames = [], onRemove }) {
  const flagged = new Set(flaggedNames);

  return (
    <View>
      {ingredients.map((ingredient) => {
        const isFlagged = flagged.has(ingredient.normalized);
        return (
          <View key={ingredient.normalized} style={[styles.row, onRemove && styles.editableRow]}>
            <Text
              style={[styles.item, isFlagged && styles.flagged]}
              // Screen readers can't see the red color, so say it in words
              accessibilityLabel={isFlagged ? `${ingredient.name}, flagged` : ingredient.name}
            >
              {isFlagged ? '⚑ ' : '• '}
              {ingredient.name}
            </Text>
            {onRemove && (
              <RemoveButton
                label={`Remove ${ingredient.name}`}
                onPress={() => onRemove(ingredient.normalized)}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // More space between rows while editing, so the × buttons are easy to hit
  editableRow: { paddingVertical: 6 },
  // flex: 1 lets long names wrap instead of pushing the × off screen
  item: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 3 },
  flagged: { color: '#c0392b', fontWeight: '600' },
});
