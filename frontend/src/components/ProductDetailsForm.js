import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '../utils/categories';
import Button from './Button';
import ChipSelect from './ChipSelect';
import TextField from './TextField';

/**
 * Product name (required), brand (optional) and category (optional) fields,
 * with Cancel and submit buttons in a bar pinned to the bottom.
 * Used by SaveProductModal (new product) and EditProductModal (existing one)
 * so both forms look and behave the same.
 *
 * onSubmit receives the trimmed values. If it throws, the error's message is
 * shown above the buttons.
 *
 * @param {{
 *   initialName?: string,
 *   initialBrand?: string,
 *   initialCategory?: string | null,
 *   submitLabel: string,          e.g. "Save product"
 *   submittingLabel: string,      e.g. "Saving…"
 *   onSubmit: (values: { productName: string, brand: string, category: string | null }) => Promise<void>,
 *   onCancel: () => void,         closes the form without saving
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
  onCancel,
  children,
}) {
  const insets = useSafeAreaInsets();
  const brandRef = useRef(null);
  const keyboardHeight = useIosKeyboardHeight();

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
      await onSubmit({ productName: productName.trim(), brand: brand.trim(), category });
      // No setSubmitting(false) here: on success the screen closes
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
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

        {children && <View style={styles.extra}>{children}</View>}
      </ScrollView>

      {/* Pinned below the scrolling fields, so Save and Cancel are always
          visible, even with the keyboard open. They used to be under the
          category chips, off the bottom of the screen. Cancel is also in
          the header on iPhone; Android only shows a back arrow there.
          With the keyboard open on iPhone, the bar sits just above it.
          Otherwise the bottom padding keeps the buttons clear of the
          iPhone home indicator and Android's navigation bar. */}
      <View
        style={[
          styles.footer,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 12 : Math.max(insets.bottom, 16) },
        ]}
      >
        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={submitting} />
          </View>
          <View style={styles.button}>
            <Button
              title={submitting ? submittingLabel : submitLabel}
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * The keyboard's height while it's open on iPhone (0 when closed, and
 * always 0 on Android).
 *
 * Why not KeyboardAvoidingView: these forms open as a sheet on iPhone,
 * which starts lower on the screen than KeyboardAvoidingView assumes, so
 * it didn't lift the buttons far enough and the keyboard covered them. The
 * sheet always reaches the bottom of the screen, so lifting the buttons by
 * exactly the keyboard's height puts them just above it.
 *
 * Android resizes the screen for the keyboard itself (see ReviewTextScreen),
 * so nothing is needed there.
 */
function useIosKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    // "Will" events arrive as the keyboard starts moving, so the bar can
    // slide up with it at the same speed
    function update(event, newHeight) {
      LayoutAnimation.configureNext({
        duration: event.duration,
        update: { type: LayoutAnimation.Types.keyboard },
      });
      setHeight(newHeight);
    }
    const show = Keyboard.addListener('keyboardWillShow', (event) =>
      update(event, event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardWillHide', (event) => update(event, 0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20 },
  // Matches TextField's label style
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  categoryField: { marginBottom: 24 },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  // Side by side, Cancel on the left like most iPhone and Android forms
  buttons: { flexDirection: 'row', gap: 12 },
  button: { flex: 1 },
  extra: { marginTop: 8 },
});
