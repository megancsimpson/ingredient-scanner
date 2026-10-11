import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../components/Button';
import Disclaimer from '../components/Disclaimer';
import IngredientResults from '../components/IngredientResults';
import { deleteSavedProduct, getSavedProduct } from '../services/api';
import { getCategoryLabel } from '../utils/categories';
import { formatDate } from '../utils/formatDate';

/**
 * One saved product: its results as they were when saved, an Edit button
 * in the header (name, brand, delete) and a Delete button at the bottom.
 *
 * Route params:
 *   id: the saved product's ID
 */
export default function ProductDetailScreen({ navigation, route }) {
  const { id } = route.params;

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load the full product (the list only has a summary). It reloads each
  // time the screen comes into view, so changes made in EditProductModal
  // show up when it closes.
  useFocusEffect(
    useCallback(() => {
      getSavedProduct(id)
        .then((data) => {
          const loaded = data.product;
          setProduct(loaded);
          navigation.setOptions({
            // Show the product's name in the header
            title: loaded.productName,
            headerRight: () => (
              <Pressable
                onPress={() =>
                  navigation.navigate('EditProduct', {
                    id,
                    productName: loaded.productName,
                    brand: loaded.brand,
                    category: loaded.category,
                  })
                }
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Edit product"
              >
                <Text style={styles.headerButton}>Edit</Text>
              </Pressable>
            ),
          });
        })
        .catch((err) => setError(err.message));
    }, [id, navigation])
  );

  function confirmDelete() {
    // Alert.alert shows the phone's own confirmation dialog on iOS and
    // Android. "destructive" makes the button red on iOS; Android ignores it.
    Alert.alert('Delete product?', `"${product.productName}" will be removed from your saved products.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSavedProduct(id);
      // The list reloads when it comes back into view
      navigation.goBack();
    } catch (err) {
      setDeleting(false);
      Alert.alert("Couldn't delete product", err.message);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{error}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2f6f5e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.meta}>
        {[product.brand, getCategoryLabel(product.category), `Saved ${formatDate(product.createdAt)}`]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      <IngredientResults ingredients={product.ingredients} flagged={product.flagged} />

      <View style={styles.section}>
        <Disclaimer />
      </View>

      <View style={styles.section}>
        <Button
          title={deleting ? 'Deleting…' : 'Delete product'}
          variant="danger"
          onPress={confirmDelete}
          disabled={deleting}
        />
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
  message: { fontSize: 15, color: '#555', textAlign: 'center' },
  meta: { fontSize: 14, color: '#666', marginBottom: 12 },
  headerButton: { color: '#2f6f5e', fontSize: 17 },
  section: { marginTop: 24 },
});
