import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import Button from '../components/Button';
import LoadingOverlay from '../components/LoadingOverlay';
import { analyzeIngredients } from '../services/api';

/**
 * Lets the user paste an ingredient list, or correct text read from a photo,
 * before it's analyzed.
 *
 * Route params:
 *   source:       'paste' or 'photo'
 *   initialText?: text to start the input with (from OCR, or a list sent from
 *                 the Ingredients search)
 *   ingredientsFound?: for photos, whether the server found an "Ingredients"
 *                 heading (and so kept only the list) or returned all the text
 */
export default function ReviewTextScreen({ navigation, route }) {
  const { source = 'paste', initialText = '', ingredientsFound = true } = route.params ?? {};
  const headerHeight = useHeaderHeight();

  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If this screen is already open and receives new text (e.g. a list sent
  // from the Ingredients search), show the new text. useState only uses
  // initialText the first time the screen appears.
  useEffect(() => {
    if (initialText) setText(initialText);
  }, [initialText]);

  async function handleCheck() {
    setError(null);
    setLoading(true);
    try {
      const result = await analyzeIngredients(text);
      // Pass everything ResultsScreen (and later, saving) needs as params;
      // nothing is saved at this point
      navigation.navigate('Results', { result, text, source });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // iOS needs help moving content above the keyboard. Android resizes the
      // screen itself, so no behavior is needed there (Expo's recommendation:
      // https://docs.expo.dev/guides/keyboard-handling/).
      // The offset is the header's height, since this view starts below it.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {/* A column: label at the top, button at the bottom, and the text box
          stretching to fill the space between. When the keyboard opens the
          column gets shorter, so the text box shrinks and the button stays
          visible. Long lists scroll inside the text box. */}
      <View style={styles.container}>
        {source === 'photo' && !ingredientsFound ? (
          // The photo had no "Ingredients" heading, so this is everything
          // the camera read, not just the list
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeText}>
              We couldn't find the word "Ingredients" in this photo, so this is all the text on
              it. Delete anything that isn't an ingredient, or go back and take a new photo with
              the whole ingredient list in the frame.
            </Text>
          </View>
        ) : (
          <Text style={styles.label}>
            {source === 'photo'
              ? 'Check the ingredient list read from your photo and fix any mistakes.'
              : 'Paste or type the ingredient list from the product label. Remove anything that isn\'t an ingredient, such as text copied from a website.'}
          </Text>
        )}

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Water, Glycerin, Coconut Oil, …"
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Ingredient list"
        />

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <View style={styles.button}>
          <Button
            title="Check ingredients"
            onPress={handleCheck}
            disabled={text.trim() === '' || loading}
          />
        </View>
      </View>

      {loading && <LoadingOverlay message="Checking ingredients…" />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20 },
  label: { fontSize: 15, color: '#444', marginBottom: 12 },
  notice: {
    backgroundColor: '#fff8e6',
    borderWidth: 1,
    borderColor: '#f0d58c',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: { fontSize: 14, color: '#6b5300', lineHeight: 20 },
  input: {
    flex: 1, // fill the space between the label and the button
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#222',
  },
  error: { color: '#c0392b', marginTop: 12, fontSize: 14 },
  button: { marginTop: 16 },
});
