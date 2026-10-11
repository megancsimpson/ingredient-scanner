import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedProducts } from '../services/api';

/**
 * Loads the user's saved products from the server.
 *
 * It reloads every time the screen comes into view, so the list is up to
 * date after saving a product on the Scan tab or deleting one on the detail
 * screen. The server is the single source of truth; the app doesn't keep
 * its own copy to update by hand.
 *
 *   const { products, loading, refreshing, error, refresh } = useSavedProducts();
 *
 * @returns {{
 *   products: import('../services/api').SavedProduct[],
 *   loading: boolean,      true during the first load (show a spinner)
 *   refreshing: boolean,   true during pull-to-refresh
 *   error: string | null,
 *   refresh: () => Promise<void>,
 * }}
 */
export default function useSavedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getSavedProducts();
      setProducts(data.products);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // For pull-to-refresh and the "Try again" button
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Runs when the screen comes into view (including the first time).
  // useFocusEffect needs a memoized function, hence useCallback.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { products, loading, refreshing, error, refresh };
}
