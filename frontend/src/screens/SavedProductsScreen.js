import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import ChipSelect from '../components/ChipSelect';
import SavedProductRow from '../components/SavedProductRow';
import useSavedProducts from '../hooks/useSavedProducts';
import { organizeProducts, SORT_OPTIONS } from '../utils/organizeProducts';

/**
 * The user's saved products. Sort by newest or name, group by brand or
 * category, or show only products with no flagged ingredients. Pull down
 * to refresh. Swipe a product left to delete it.
 *
 * Sorting happens in the app: the list is already loaded, so changing the
 * order doesn't need another request. The chosen order resets when the app
 * restarts.
 */
export default function SavedProductsScreen({ navigation }) {
  const { products, loading, refreshing, error, refresh, deleteProduct } = useSavedProducts();
  const [sortBy, setSortBy] = useState('newest');

  // Only re-sort when the products or the sort option change
  const sections = useMemo(() => organizeProducts(products, sortBy), [products, sortBy]);

  // The row whose Delete button is showing, as { id, close }, so only one
  // row is open at a time. A ref rather than state: changing it doesn't
  // need to redraw the list.
  const openRowRef = useRef(null);

  function handleSwipeStart(id, close) {
    // Close the previously opened row, unless it's the one being swiped
    if (openRowRef.current && openRowRef.current.id !== id) {
      openRowRef.current.close();
    }
    openRowRef.current = { id, close };
  }

  // Same confirmation as ProductDetailScreen, since a delete can't be undone.
  // Alert.alert shows the phone's own dialog on iOS and Android.
  function confirmDelete(product) {
    Alert.alert('Delete product?', `"${product.productName}" will be removed from your saved products.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(product.id) },
    ]);
  }

  async function handleDelete(id) {
    try {
      await deleteProduct(id);
    } catch (err) {
      Alert.alert("Couldn't delete product", err.message);
    }
  }

  // First load: nothing to show yet
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2f6f5e" />
      </View>
    );
  }

  // Couldn't load and there's nothing from an earlier load to show
  if (error && products.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{error}</Text>
        <View style={styles.retry}>
          <Button title="Try again" variant="secondary" onPress={refresh} />
        </View>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(product) => product.id}
      renderItem={({ item }) => (
        <SavedProductRow
          productName={item.productName}
          brand={item.brand}
          category={item.category}
          flaggedCount={item.flagged.length}
          createdAt={item.createdAt}
          onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
          onDelete={() => confirmDelete(item)}
          onSwipeStart={(close) => handleSwipeStart(item.id, close)}
        />
      )}
      // Group headings (only "brand" and "category" have titles)
      renderSectionHeader={({ section }) =>
        section.title ? (
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {section.title} ({section.data.length})
          </Text>
        ) : null
      }
      // Keep the current group's heading at the top while scrolling. This is
      // on by default on iOS and off on Android, so set it for both.
      stickySectionHeadersEnabled
      ListHeaderComponent={
        products.length > 0 ? (
          <View style={styles.sortBar}>
            <ChipSelect
              options={SORT_OPTIONS}
              selected={sortBy}
              onSelect={setSortBy}
              accessibilityLabel="Sort saved products"
            />
          </View>
        ) : null
      }
      // Pull-to-refresh, with the native spinner on both iOS and Android
      refreshing={refreshing}
      onRefresh={refresh}
      // flexGrow lets the empty message sit in the middle of the screen
      contentContainerStyle={sections.length === 0 && styles.emptyContainer}
      ListEmptyComponent={
        products.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No saved products yet</Text>
            <Text style={styles.message}>
              Check a product on the Scan tab, then tap "Save product" to keep it here.
            </Text>
          </View>
        ) : (
          // There are products, but the "Non pore-clogging" filter hides them all
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No products without flags</Text>
            <Text style={styles.message}>
              All of your saved products have at least one flagged ingredient.
            </Text>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: '#fff' },
  sortBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    // Solid background so rows don't show through the sticky heading
    backgroundColor: '#f7f7f7',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  emptyContainer: { flexGrow: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginBottom: 8 },
  message: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 21 },
  retry: { marginTop: 16, alignSelf: 'stretch' },
});
