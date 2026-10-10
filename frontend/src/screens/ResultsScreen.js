import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Disclaimer from '../components/Disclaimer';
import FlaggedIngredientCard from '../components/FlaggedIngredientCard';
import IngredientList from '../components/IngredientList';

/**
 * Shows the result of analyzing an ingredient list. Nothing is saved yet.
 *
 * Route params:
 *   result: response from analyzeIngredients() ({ ingredients, flagged })
 *   text:   the text that was analyzed (needed later for saving)
 *   source: 'paste' or 'photo'
 */
export default function ResultsScreen({ route }) {
  const { result } = route.params;
  const { ingredients, flagged } = result;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.summary}>
        {flagged.length === 0
          ? 'No ingredients from the pore-clogging list were found.'
          : `${flagged.length} of ${ingredients.length} ingredients flagged`}
      </Text>

      {flagged.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Flagged ingredients</Text>
          {flagged.map((item) => (
            <FlaggedIngredientCard
              key={item.normalized}
              name={item.name}
              sources={item.sources}
              matchedBy={item.matches.map((match) => match.name)}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.heading}>All ingredients ({ingredients.length})</Text>
        <IngredientList
          ingredients={ingredients}
          flaggedNames={flagged.map((item) => item.normalized)}
        />
      </View>

      {/* TODO: "Save product" button that opens SaveProductModal */}

      <View style={styles.section}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#fff' },
  container: { padding: 20 },
  summary: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  section: { marginTop: 24 },
  heading: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 10 },
});
