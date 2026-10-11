import { Alert } from 'react-native';
import ProductDetailsForm from '../components/ProductDetailsForm';
import { saveProduct } from '../services/api';
import { formatDate } from '../utils/formatDate';

/**
 * Asks what to do when a product with the same name and brand is already
 * saved. Shows the phone's own alert (three buttons is the most Android
 * allows) and waits for the answer.
 *
 * @param {{ productName: string, brand?: string, createdAt: string }} duplicate
 * @returns {Promise<'replace' | 'keep' | 'cancel'>}
 */
function askAboutDuplicate(duplicate) {
  const name = duplicate.brand
    ? `"${duplicate.productName}" (${duplicate.brand})`
    : `"${duplicate.productName}"`;

  return new Promise((resolve) => {
    Alert.alert(
      'Already saved',
      `You saved ${name} on ${formatDate(duplicate.createdAt)}. Replace it with these results, or keep both?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
        { text: 'Keep both', onPress: () => resolve('keep') },
        // Red on iOS, since it deletes the old product
        { text: 'Replace', style: 'destructive', onPress: () => resolve('replace') },
      ],
      // Android: tapping outside the alert closes it, which counts as Cancel
      { cancelable: true, onDismiss: () => resolve('cancel') }
    );
  });
}

/**
 * Asks for a product name (required), brand and category (optional), then saves.
 * Opened from ResultsScreen. It's shown as a modal: a sheet that slides up
 * on iPhone, and a full screen on Android, where sheets aren't the norm.
 *
 * If a product with the same name and brand is already saved, asks whether
 * to replace it, keep both, or cancel.
 *
 * Route params:
 *   text:   the ingredient text that was analyzed
 *   source: 'paste' or 'photo'
 */
export default function SaveProductModal({ navigation, route }) {
  const { text, source } = route.params;

  async function handleSave({ productName, brand, category }) {
    const product = { productName, brand, category, rawText: text, source };

    try {
      await saveProduct(product);
    } catch (err) {
      // Anything other than "already saved" is shown on the form as usual
      if (err.status !== 409 || !err.data?.duplicate) throw err;

      const choice = await askAboutDuplicate(err.data.duplicate);
      // Returning false keeps the form open so the user can change the name
      if (choice === 'cancel') return false;
      await saveProduct({ ...product, onDuplicate: choice });
    }

    // Back to the start of the Scan tab, so going back there later shows
    // a fresh scan instead of results that are already saved...
    navigation.popToTop();
    // ...then show the Saved tab, which reloads and includes the new product
    navigation.navigate('SavedTab', { screen: 'SavedProducts' });
  }

  return (
    <ProductDetailsForm submitLabel="Save product" submittingLabel="Saving…" onSubmit={handleSave} />
  );
}
