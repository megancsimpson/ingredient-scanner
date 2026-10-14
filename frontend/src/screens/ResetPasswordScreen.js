import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import Button from '../components/Button';
import TextField from '../components/TextField';
import useAuth from '../hooks/useAuth';
import { requestPasswordReset } from '../services/api';

// Must match the server's rules (backend/services/authService.js); the
// server checks again, these just give quicker feedback
const MIN_PASSWORD_LENGTH = 8;
const CODE_MINUTES = 15;
const RESEND_WAIT_SECONDS = 60;

/**
 * Checks the form before sending it, like RegisterScreen.
 * @returns {object} field name -> error message (empty if all good)
 */
function validate({ code, password, confirmPassword }) {
  const errors = {};
  if (!/^\d{6}$/.test(code)) errors.code = 'Enter the 6-digit code from the email.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
  return errors;
}

/**
 * "Forgot password", step 2: the user enters the emailed code and a new
 * password. On success AuthContext logs them in, and RootNavigator switches
 * to the app automatically.
 */
export default function ResetPasswordScreen({ route }) {
  const { email } = route.params;
  const { resetPassword } = useAuth();
  const headerHeight = useHeaderHeight();
  const confirmRef = useRef(null);

  const [form, setForm] = useState({ code: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Seconds until "Send a new code" can be tapped. The server ignores
  // requests within a minute of the last one, so the app waits too.
  const [resendIn, setResendIn] = useState(RESEND_WAIT_SECONDS);

  const update = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  // Count down once a second until resending is allowed
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function handleReset() {
    if (submitting) return;
    setError(null);
    setNotice(null);

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword(email, form.code, form.password);
      // Logged in: RootNavigator replaces this screen with the app
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setResendIn(RESEND_WAIT_SECONDS);
    try {
      await requestPasswordReset(email);
      setNotice('We sent a new code. Codes from earlier emails no longer work.');
    } catch (err) {
      setError(err.message);
      // Let them try again straight away if the request itself failed
      setResendIn(0);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* "If an account exists" because the server doesn't say whether it does */}
        <Text style={styles.intro}>
          If there's an account for <Text style={styles.email}>{email}</Text>, we've emailed it a
          6-digit code. It works for {CODE_MINUTES} minutes. Check your spam folder if you
          don't see it.
        </Text>

        <TextField
          label="Code"
          value={form.code}
          // Keep only digits, so a pasted "123 456" still works
          onChangeText={(text) => update('code')(text.replace(/\D/g, ''))}
          error={fieldErrors.code}
          keyboardType="number-pad"
          maxLength={6}
          // Lets the keyboard offer the code from a recent email or message
          // (iOS reads Mail; Android depends on the keyboard)
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        {/* No "next" from the code field: the number pad on iPhone has no return key */}
        <TextField
          label="New password"
          value={form.password}
          onChangeText={update('password')}
          error={fieldErrors.password}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
        <TextField
          ref={confirmRef}
          label="Confirm new password"
          value={form.confirmPassword}
          onChangeText={update('confirmPassword')}
          error={fieldErrors.confirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleReset}
        />

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <Button
          title={submitting ? 'Saving…' : 'Reset password and log in'}
          onPress={handleReset}
          disabled={submitting}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>No email?</Text>
          <Pressable
            onPress={handleResend}
            disabled={resendIn > 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: resendIn > 0 }}
            hitSlop={8}
          >
            <Text style={[styles.link, resendIn > 0 && styles.linkDisabled]}>
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24 },
  intro: { fontSize: 16, color: '#555', lineHeight: 22, marginBottom: 20 },
  email: { fontWeight: '600', color: '#333' },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  notice: { color: '#2f6f5e', fontSize: 14, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontSize: 15, color: '#555' },
  link: { fontSize: 15, color: '#2f6f5e', fontWeight: '600' },
  linkDisabled: { color: '#999' },
});
