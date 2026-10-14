import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { sendVerificationCode } from '../services/api';

const CODE_MINUTES = 15;
const RESEND_WAIT_SECONDS = 60;

/**
 * Shown instead of the app while the user's email isn't verified (see
 * RootNavigator): right after signing up, or when logging in to an account
 * that was never verified. Emails a code when it opens; entering it unlocks
 * the app.
 */
export default function VerifyEmailScreen() {
  const { user, verifyEmail, logout, deleteAccount } = useAuth();
  const headerHeight = useHeaderHeight();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_WAIT_SECONDS);

  // Email a code when the screen opens. The server keeps a code that still
  // works instead of sending another, so reopening the app doesn't
  // replace the code in an email the user already has. The ref stops a
  // second request if React runs this effect twice in development.
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    sendVerificationCode().catch((err) => {
      setError(err.message);
      setResendIn(0);
    });
  }, []);

  // Count down once a second until resending is allowed
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function handleVerify() {
    if (submitting) return;
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(code)) {
      setCodeError('Enter the 6-digit code from the email.');
      return;
    }
    setCodeError(null);

    setSubmitting(true);
    try {
      await verifyEmail(code);
      // Verified: RootNavigator replaces this screen with the app
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
      await sendVerificationCode({ resend: true });
      setNotice('We sent a new code. Codes from earlier emails no longer work.');
    } catch (err) {
      setError(err.message);
      setResendIn(0);
    }
  }

  // A typo in the email at sign-up would otherwise leave the user stuck:
  // the code goes to the wrong address, and the email can't be changed.
  // Deleting the account lets them sign up again.
  function handleWrongEmail() {
    Alert.alert(
      'Start over?',
      `This deletes the account for ${user.email} so you can sign up again with the right email.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete and start over',
          style: 'destructive',
          onPress: () => deleteAccount().catch((err) => setError(err.message)),
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Same as the other forms: iOS needs "padding", Android resizes the screen itself
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          We've emailed a 6-digit code to <Text style={styles.email}>{user.email}</Text>. Enter
          it below to finish setting up your account. It works for {CODE_MINUTES} minutes.
          Check your spam folder if you don't see it.
        </Text>

        <TextField
          label="Code"
          value={code}
          // Keep only digits, so a pasted "123 456" still works
          onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
          error={codeError}
          keyboardType="number-pad"
          maxLength={6}
          // Lets the keyboard offer the code from a recent email or message
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <Button
          title={submitting ? 'Checking…' : 'Verify email'}
          onPress={handleVerify}
          disabled={submitting}
        />

        <View style={styles.row}>
          <Text style={styles.rowText}>No email?</Text>
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

        <View style={styles.row}>
          <Text style={styles.rowText}>Wrong email?</Text>
          <Pressable onPress={handleWrongEmail} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Start over</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={logout}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.logout}
        >
          <Text style={styles.link}>Log out</Text>
        </Pressable>
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
  row: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  rowText: { fontSize: 15, color: '#555' },
  link: { fontSize: 15, color: '#2f6f5e', fontWeight: '600' },
  linkDisabled: { color: '#999' },
  logout: { alignSelf: 'center', marginTop: 20 },
});
