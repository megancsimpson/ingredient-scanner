import { useState } from 'react';
import { Alert } from 'react-native';
import Button from '../components/Button';
import ProductDetailsForm from '../components/ProductDetailsForm';
import { deleteSavedProduct, updateSavedProduct } from '../services/api';
import { askAboutDuplicate } from '../utils/askAboutDuplicate';

/**
 * Edit a saved product's name, brand and category, or delete it.
 * Opened from ProductDetailScreen's "Edit" button. Shown as a modal, like
 * SaveProductModal.
 *
 * The results can't be edited: they're a snapshot of what was checked.
 *
 * If the new name and brand match another saved product, asks whether to
 * replace that product, keep both, or cancel. Cancel stays on the form so
 * the name can be changed.
 *
 * Route params:
 *   id, productName, brand, category: the product being edited
 */
export default function EditProductModal({ navigation, route }) {
  const { id, productName, brand, category } = route.params;
  const [deleting, setDeleting] = useState(false);

  async function handleSave(values) {
    try {
      await updateSavedProduct(id, values);
    } catch (err) {
      // Anything other than "already saved" is shown on the form as usual
      if (err.status !== 409 || !err.data?.duplicate) throw err;

      const choice = await askAboutDuplicate(err.data.duplicate, 'edit');
      // Returning false keeps the form open so the user can change the name
      if (choice === 'cancel') return false;
      await updateSavedProduct(id, { ...values, onDuplicate: choice });
    }
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
