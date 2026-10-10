import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import Button from '../components/Button';
import TextField from '../components/TextField';
import useAuth from '../hooks/useAuth';

// Must match the server's rules (backend/services/authService.js); the
// server checks again, these just give quicker feedback
const MIN_PASSWORD_LENGTH = 8;

/**
 * Checks the form before sending it, so simple mistakes are shown next to
 * the right field instead of waiting for the server.
 * @returns {object} field name -> error message (empty if all good)
 */
function validate({ name, email, password, confirmPassword }) {
  const errors = {};
  if (name.trim() === '') errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  // There's no "forgot password" yet, so catching a typo here matters
  if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
  return errors;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const headerHeight = useHeaderHeight();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Returns a change handler for one field, e.g. update('email')
  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  async function handleRegister() {
    if (submitting) return;
    setError(null);

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // On success RootNavigator switches to the app automatically
      await register(form.name.trim(), form.email.trim(), form.password);
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
          label="Name"
          value={form.name}
          onChangeText={update('name')}
          error={fieldErrors.name}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label="Email"
          value={form.email}
          onChangeText={update('email')}
          error={fieldErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={form.password}
          onChangeText={update('password')}
          error={fieldErrors.password}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          secureTextEntry
          autoCapitalize="none"
          // "new-password" lets iOS and Android suggest a strong password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label="Confirm password"
          value={form.confirmPassword}
          onChangeText={update('confirmPassword')}
          error={fieldErrors.confirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleRegister}
        />

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Button
          title={submitting ? 'Creating account…' : 'Create account'}
          onPress={handleRegister}
          disabled={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24 },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 12 },
});
