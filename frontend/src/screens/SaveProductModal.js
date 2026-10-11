import ProductDetailsForm from '../components/ProductDetailsForm';
import { saveProduct } from '../services/api';

/**
 * Asks for a product name (required), brand and category (optional), then saves.
 * Opened from ResultsScreen. It's shown as a modal: a sheet that slides up
 * on iPhone, and a full screen on Android, where sheets aren't the norm.
 *
 * Route params:
 *   text:   the ingredient text that was analyzed
 *   source: 'paste' or 'photo'
 */
export default function SaveProductModal({ navigation, route }) {
  const { text, source } = route.params;

  async function handleSave({ productName, brand, category }) {
    await saveProduct({ productName, brand, category, rawText: text, source });
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
