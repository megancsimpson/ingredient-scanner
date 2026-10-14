import { useRef, useState } from 'react';
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

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const headerHeight = useHeaderHeight();
  const passwordRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '' && !submitting;

  async function handleLogin() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      // On success AuthContext stores the token, and RootNavigator switches
      // to the app automatically, so there's no navigate() here
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Same approach as ReviewTextScreen: iOS needs "padding", Android
      // resizes the screen itself
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ingredient Scanner</Text>
        <Text style={styles.subtitle}>Log in to check your products.</Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          // Lets iOS and Android offer saved logins
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        <Pressable
          // Passes the typed email along so it doesn't have to be entered again
          onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
          accessibilityRole="link"
          hitSlop={8}
          style={styles.forgot}
        >
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        {error && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <Button
          title={submitting ? 'Logging in…' : 'Log in'}
          onPress={handleLogin}
          disabled={!canSubmit}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Pressable
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  // flexGrow + center puts the form in the middle of the screen, while
  // still letting it scroll on small phones when the keyboard is open
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2f6f5e' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 6, marginBottom: 28 },
  // Right-aligned under the password field, where people look for it
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  error: { color: '#c0392b', fontSize: 14, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontSize: 15, color: '#555' },
  link: { fontSize: 15, color: '#2f6f5e', fontWeight: '600' },
});
