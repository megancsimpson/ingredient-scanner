import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { CATEGORIES } from '../utils/categories';
import Button from './Button';
import ChipSelect from './ChipSelect';
import TextField from './TextField';

/**
 * Product name (required), brand (optional) and category (optional) fields
 * with a submit button.
 * Used by SaveProductModal (new product) and EditProductModal (existing one)
 * so both forms look and behave the same.
 *
 * onSubmit receives the trimmed values. If it throws, the error's message is
 * shown above the button. If it returns false, the form stays open and can
 * be submitted again (e.g. the user cancelled a "duplicate product" prompt).
 *
 * @param {{
 *   initialName?: string,
 *   initialBrand?: string,
 *   initialCategory?: string | null,
 *   submitLabel: string,          e.g. "Save product"
 *   submittingLabel: string,      e.g. "Saving…"
 *   onSubmit: (values: { productName: string, brand: string, category: string | null }) => Promise<void | false>,
 *   children?: React.ReactNode,   extra content under the button (e.g. Delete)
 * }} props
 */
export default function ProductDetailsForm({
  initialName = '',
  initialBrand = '',
  initialCategory = null,
  submitLabel,
  submittingLabel,
  onSubmit,
  children,
}) {
  const headerHeight = useHeaderHeight();
  const brandRef = useRef(null);

  const [productName, setProductName] = useState(initialName);
  const [brand, setBrand] = useState(initialBrand);
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = productName.trim() !== '' && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await onSubmit({ productName: productName.trim(), brand: brand.trim(), category });
      // On success the screen closes, so only re-enable the button if the
      // user chose to stay
      if (outcome === false) setSubmitting(false);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TextField
          label="Product name"
          value={productName}
          onChangeText={setProductName}
          placeholder="e.g. Daily Moisturizer"
          autoCapitalize="words"
          // Jump straight into typing for a new product; when editing, the
          // user may only want to change the brand
          autoFocus={initialName === ''}
          maxLength={100}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => brandRef.current?.focus()}
        />
        <TextField
          ref={brandRef}
          label="Brand (optional)"
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
          maxLength={100}
          // "Done" closes the keyboard so the category is easy to reach
          returnKeyType="done"
        />

        <View style={styles.categoryField}>
          <Text style={styles.label}>Category (optional)</Text>
          <ChipSelect
            options={CATEGORIES}
            selected={category}
            onSelect={setCategory}
            // Tap the selected category again to clear it
            allowDeselect
            accessibilityLabel="Category"
          />
        </View>

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Button
          title={submitting ? submittingLabel : submitLabel}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />

        {children && <View style={styles.extra}>{children}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },
  // Matches TextField's label style
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  categoryField: { marginBottom: 24 },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  extra: { marginTop: 32 },
});
