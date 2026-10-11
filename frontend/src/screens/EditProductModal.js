import { useState } from 'react';
import { Alert } from 'react-native';
import Button from '../components/Button';
import ProductDetailsForm from '../components/ProductDetailsForm';
import { deleteSavedProduct, updateSavedProduct } from '../services/api';

/**
 * Edit a saved product's name, brand and category, or delete it.
 * Opened from ProductDetailScreen's "Edit" button. Shown as a modal, like
 * SaveProductModal.
 *
 * The results can't be edited: they're a snapshot of what was checked.
 *
 * Route params:
 *   id, productName, brand, category: the product being edited
 */
export default function EditProductModal({ navigation, route }) {
  const { id, productName, brand, category } = route.params;
  const [deleting, setDeleting] = useState(false);

  async function handleSave(values) {
    await updateSavedProduct(id, values);
    // ProductDetailScreen reloads when it comes back into view
    navigation.goBack();
  }

  function confirmDelete() {
    Alert.alert('Delete product?', `"${productName}" will be removed from your saved products.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSavedProduct(id);
      // Close this modal and the deleted product's screen, back to the list
      navigation.popToTop();
    } catch (err) {
      setDeleting(false);
      Alert.alert("Couldn't delete product", err.message);
    }
  }

  return (
    <ProductDetailsForm
      initialName={productName}
      initialBrand={brand ?? ''}
      initialCategory={category ?? null}
      submitLabel="Save changes"
      submittingLabel="Saving…"
      onSubmit={handleSave}
    >
      <Button
        title={deleting ? 'Deleting…' : 'Delete product'}
        variant="danger"
        onPress={confirmDelete}
        disabled={deleting}
      />
    </ProductDetailsForm>
  );
}
