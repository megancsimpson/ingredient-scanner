import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { requestPasswordReset } from '../services/api';

/**
 * "Forgot password", step 1: the user enters their email and the server
 * emails them a 6-digit code. Then ResetPasswordScreen takes the code and
 * a new password.
 *
 * Opened from LoginScreen, which passes whatever email was already typed.
 */
export default function ForgotPasswordScreen({ navigation, route }) {
  const headerHeight = useHeaderHeight();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    if (submitting) return;
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(cleanEmail);
      // navigate (not replace) so Back returns here to fix a mistyped email
      navigation.navigate('ResetPassword', { email: cleanEmail });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Same as LoginScreen: iOS needs "padding", Android resizes the screen itself
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Enter the email you signed up with and we'll send you a code to reset your password.
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Button
          title={submitting ? 'Sending…' : 'Send code'}
          onPress={handleSend}
          disabled={submitting || email.trim() === ''}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24 },
  intro: { fontSize: 16, color: '#555', lineHeight: 22, marginBottom: 20 },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 12 },
});
