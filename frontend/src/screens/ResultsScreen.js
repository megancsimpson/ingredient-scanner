import { ScrollView, StyleSheet, View } from 'react-native';
import Button from '../components/Button';
import Disclaimer from '../components/Disclaimer';
import IngredientResults from '../components/IngredientResults';

/**
 * Shows the result of analyzing an ingredient list. Nothing is saved until
 * the user taps "Save product".
 *
 * Route params:
 *   result: response from analyzeIngredients() ({ ingredients, flagged })
 *   text:   the text that was analyzed (sent when saving)
 *   source: 'paste' or 'photo'
 */
export default function ResultsScreen({ navigation, route }) {
  const { result, text, source } = route.params;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <IngredientResults ingredients={result.ingredients} flagged={result.flagged} />

      <View style={styles.section}>
        <Button
          title="Save product"
          onPress={() => navigation.navigate('SaveProduct', { text, source })}
        />
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
});
