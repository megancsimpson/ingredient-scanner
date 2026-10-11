import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Disclaimer from '../components/Disclaimer';
import { getIngredient } from '../services/api';

/**
 * One ingredient from the pore-clogging list: which lists include it, other
 * names it goes by, and any notes.
 *
 * Route params:
 *   id: the ingredient's ID
 */
export default function IngredientDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [ingredient, setIngredient] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getIngredient(id)
      .then((data) => {
        setIngredient(data.ingredient);
        navigation.setOptions({ title: data.ingredient.name });
      })
      .catch((err) => setError(err.message));
  }, [id, navigation]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{error}</Text>
      </View>
    );
  }

  if (!ingredient) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2f6f5e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.name}>{ingredient.name}</Text>
      <View style={styles.flag}>
        <Text style={styles.flagText}>⚑ On the pore-clogging list</Text>
      </View>

      <Text style={styles.body}>
        Products are flagged when an ingredient's name contains the words "{ingredient.name}".
      </Text>

      {ingredient.sources.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Listed by</Text>
          <Text style={styles.body}>{ingredient.sources.join(', ')}</Text>
        </View>
      )}

      {ingredient.aliases.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Also known as</Text>
          <Text style={styles.body}>{ingredient.aliases.join(', ')}</Text>
        </View>
      )}

      {ingredient.notes && (
        <View style={styles.section}>
          <Text style={styles.heading}>Notes</Text>
          <Text style={styles.body}>{ingredient.notes}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#fff' },
  container: { padding: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  name: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  flag: {
    alignSelf: 'flex-start',
    backgroundColor: '#fdf1ef',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    marginBottom: 16,
  },
  flagText: { color: '#c0392b', fontWeight: '600', fontSize: 13 },
  section: { marginTop: 24 },
  heading: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 6 },
  body: { fontSize: 15, color: '#444', lineHeight: 21 },
});
