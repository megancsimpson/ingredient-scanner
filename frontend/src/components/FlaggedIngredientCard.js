import { StyleSheet, Text, View } from 'react-native';

/**
 * One flagged ingredient.
 *
 * @param {{
 *   name: string,                 ingredient as written on the label
 *   sources?: string[],           lists that flag it, e.g. ["Face Reality"]
 *   matchedBy?: string[],         database names that matched, e.g. ["Coconut", "Coconut Oil"]
 * }} props
 */
export default function FlaggedIngredientCard({ name, sources = [], matchedBy = [] }) {
  // Only worth showing when it adds something, e.g. "Cocos Nucifera (Coconut)
  // Oil" flagged by "Coconut". Not when the only match is the name itself.
  const showMatchedBy =
    matchedBy.length > 1 ||
    (matchedBy.length === 1 && matchedBy[0].toLowerCase() !== name.toLowerCase());

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{name}</Text>
      {showMatchedBy && <Text style={styles.detail}>Matches: {matchedBy.join(', ')}</Text>}
      {sources.length > 0 && <Text style={styles.detail}>Listed by: {sources.join(', ')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fdf1ef',
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  detail: { fontSize: 13, color: '#555', marginTop: 4 },
});
