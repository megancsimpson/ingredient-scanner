import { StyleSheet, Text, View } from 'react-native';
import FlaggedIngredientCard from './FlaggedIngredientCard';
import IngredientList from './IngredientList';

/**
 * The results of an analysis: a summary line, the flagged ingredients and
 * the full ingredient list. Shared by ResultsScreen (a new scan) and
 * ProductDetailScreen (a saved product) so both look the same.
 *
 * @param {{
 *   ingredients: { name: string, normalized: string }[],
 *   flagged: { name: string, normalized: string, sources: string[],
 *              matches: { name: string }[] }[],
 * }} props
 */
export default function IngredientResults({ ingredients, flagged }) {
  return (
    <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  section: { marginTop: 24 },
  heading: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 10 },
});
