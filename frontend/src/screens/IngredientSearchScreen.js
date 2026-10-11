import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import FlaggedIngredientCard from '../components/FlaggedIngredientCard';
import SearchBar from '../components/SearchBar';
import { searchIngredients } from '../services/api';

// How long to wait after the last keystroke before searching, so typing
// "coconut" sends one request instead of seven
const SEARCH_DELAY_MS = 300;

/**
 * Search the pore-clogging ingredient list. Shows the whole list until
 * something is typed. Typing a full ingredient from a label (e.g. "Cocos
 * Nucifera (Coconut) Oil") also shows the list entries that would flag it.
 */
export default function IngredientSearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Changing this re-runs the search (used by "Try again")
  const [retryCount, setRetryCount] = useState(0);

  // Each search gets a number. If an older, slower search finishes after a
  // newer one, its results are ignored, so the list always matches what's
  // in the search bar.
  const latestSearch = useRef(0);

  useEffect(() => {
    const searchNumber = ++latestSearch.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchIngredients(query.trim());
        if (searchNumber !== latestSearch.current) return;
        setIngredients(data.ingredients);
        setError(null);
      } catch (err) {
        if (searchNumber !== latestSearch.current) return;
        setError(err.message);
      } finally {
        if (searchNumber === latestSearch.current) setLoading(false);
      }
    }, query === '' ? 0 : SEARCH_DELAY_MS);

    // Typing again before the delay is up cancels this search
    return () => clearTimeout(timer);
  }, [query, retryCount]);

  const searching = query.trim() !== '';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search ingredients"
        />
        <Text style={styles.hint}>
          {searching
            ? loading
              ? 'Searching…'
              : `${ingredients.length} ${ingredients.length === 1 ? 'match' : 'matches'}`
            : "Search by name, or paste an ingredient from a label to see if it's flagged."}
        </Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.message}>{error}</Text>
          <View style={styles.retry}>
            <Button
              title="Try again"
              variant="secondary"
              onPress={() => setRetryCount((count) => count + 1)}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(ingredient) => ingredient.id}
          renderItem={({ item }) => (
            <FlaggedIngredientCard
              name={item.name}
              sources={item.sources}
              onPress={() => navigation.navigate('IngredientDetail', { id: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          // Hide the keyboard when scrolling through results, and let a tap
          // on a result work even while the keyboard is open
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.spinner} size="large" color="#2f6f5e" />
            ) : (
              searching && (
                <View style={styles.center}>
                  <Text style={styles.emptyTitle}>Not on the list</Text>
                  <Text style={styles.message}>
                    "{query.trim()}" doesn't match any ingredient on the pore-clogging list.
                  </Text>
                </View>
              )
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  hint: { fontSize: 13, color: '#666', marginTop: 8, lineHeight: 18 },
  listContent: { padding: 16 },
  spinner: { marginTop: 40 },
  center: { alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 8 },
  message: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 21 },
  retry: { marginTop: 16, alignSelf: 'stretch' },
});
