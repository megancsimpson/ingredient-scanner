import { useState } from 'react';
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
 *   initialText?: text from OCR, to start the input with
 */
export default function ReviewTextScreen({ navigation, route }) {
  const { source = 'paste', initialText = '' } = route.params ?? {};
  const headerHeight = useHeaderHeight();

  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <Text style={styles.label}>
          {source === 'photo'
            ? 'Check the text read from your photo and fix any mistakes.'
            : 'Paste or type the ingredient list from the product label.'}
        </Text>

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
