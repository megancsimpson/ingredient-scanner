import ProductDetailsForm from '../components/ProductDetailsForm';
import { saveProduct } from '../services/api';
import { askAboutDuplicate } from '../utils/askAboutDuplicate';

/**
 * Asks for a product name (required), brand and category (optional), then saves.
 * Opened from ResultsScreen. It's shown as a modal: a sheet that slides up
 * on iPhone, and a full screen on Android, where sheets aren't the norm.
 *
 * If a product with the same name and brand is already saved, asks whether
 * to replace it, keep both, or cancel. Cancel goes back to a fresh scan.
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

      const choice = await askAboutDuplicate(err.data.duplicate, 'save');
      if (choice === 'cancel') {
        // Nothing is saved; close the form and the results, back to the
        // start of the Scan tab
        navigation.popToTop();
        return;
      }
      await saveProduct({ ...product, onDuplicate: choice });
    }

    // Back to the start of the Scan tab, so going back there later shows
    // a fresh scan instead of results that are already saved...
    navigation.popToTop();
    // ...then show the Saved tab, which reloads and includes the new product
    navigation.navigate('SavedTab', { screen: 'SavedProducts' });
  }

  return (
    <ProductDetailsForm
      submitLabel="Save product"
      submittingLabel="Saving…"
      onSubmit={handleSave}
      // Not saving this product: back to the start of the Scan tab, like
      // Cancel on ResultsScreen. (Swiping the sheet down on iPhone, or the
      // back arrow on Android, still returns to the results.)
      onCancel={() => navigation.popToTop()}
    />
  );
}
