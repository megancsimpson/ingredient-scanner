import { useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Disclaimer from '../components/Disclaimer';
import IngredientResults from '../components/IngredientResults';

/**
 * Shows the result of analyzing an ingredient list. Nothing is saved until
 * the user taps "Save product".
 *
 * "Edit" in the header lets the user remove pieces that aren't ingredients
 * (e.g. website text pasted by accident) without going back to the text box.
 *
 * Route params:
 *   result: response from analyzeIngredients() ({ ingredients, flagged })
 *   text:   the text that was analyzed (sent when saving)
 *   source: 'paste' or 'photo'
 */
export default function ResultsScreen({ navigation, route }) {
  const { result, text, source } = route.params;

  const [editing, setEditing] = useState(false);
  // Normalized names of the ingredients the user removed
  const [removed, setRemoved] = useState(() => new Set());

  // Removing an ingredient also removes its flag. Each ingredient is matched
  // on its own, so this gives exactly what re-analyzing the shorter list
  // would, without waiting for the server.
  const ingredients = result.ingredients.filter((item) => !removed.has(item.normalized));
  const flagged = result.flagged.filter((item) => !removed.has(item.normalized));
  const hasChanges = removed.size > 0;

  function removeIngredient(normalized) {
    setRemoved((current) => new Set(current).add(normalized));
  }

  // "Edit" / "Done" in the header. useLayoutEffect updates it before the
  // screen is drawn, so the button never shows the wrong label.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setEditing((current) => !current)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Done editing' : 'Edit ingredients'}
        >
          <Text style={styles.headerButton}>{editing ? 'Done' : 'Edit'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, editing]);

  function handleSave() {
    // Save the edited list rather than the original text. The server
    // analyzes the text again when saving, and the remaining names joined
    // with commas parse back into exactly the same ingredients.
    const textToSave = hasChanges ? ingredients.map((item) => item.name).join(', ') : text;
    navigation.navigate('SaveProduct', { text: textToSave, source });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {editing && (
        <View style={styles.editBanner}>
          <Text style={styles.editText}>
            Tap × to remove anything that isn't an ingredient, then tap Done.
          </Text>
          {hasChanges && (
            <Pressable
              onPress={() => setRemoved(new Set())}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.undo}>Undo all changes</Text>
            </Pressable>
          )}
        </View>
      )}

      {ingredients.length === 0 ? (
        <View style={styles.editBanner}>
          <Text style={styles.emptyText}>All ingredients have been removed.</Text>
          <Pressable onPress={() => setRemoved(new Set())} hitSlop={8} accessibilityRole="button">
            <Text style={styles.undo}>Undo all changes</Text>
          </Pressable>
        </View>
      ) : (
        <IngredientResults
          ingredients={ingredients}
          flagged={flagged}
          onRemove={editing ? removeIngredient : undefined}
        />
      )}

      <View style={styles.section}>
        <Button title="Save product" onPress={handleSave} disabled={ingredients.length === 0} />
      </View>

      <View style={styles.section}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#fff' },
  container: { padding: 20 },
  section: { marginTop: 24 },
  headerButton: { color: '#2f6f5e', fontSize: 17 },
  editBanner: {
    backgroundColor: '#eef6f3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  editText: { fontSize: 14, color: '#2f6f5e', lineHeight: 20 },
  undo: { fontSize: 14, color: '#2f6f5e', fontWeight: '600', textDecorationLine: 'underline' },
  emptyText: { fontSize: 15, color: '#555', lineHeight: 21 },
});
