import { ActivityIndicator, StyleSheet, View } from 'react-native';
import useAuth from '../hooks/useAuth';
import AppTabs from './AppTabs';
import AuthStack from './AuthStack';
import VerifyEmailStack from './VerifyEmailStack';

/**
 * Chooses which part of the app to show: the login screens when logged out,
 * the verification screen when logged in with an unverified email, and the
 * tabs otherwise. Logging in or out, or verifying, changes the token or
 * user, which re-renders this and switches the whole app. Screens that
 * aren't allowed yet can't be reached because they aren't rendered at all.
 */
export default function RootNavigator() {
  const { token, user, isLoading } = useAuth();

  // Checking for a saved login when the app opens
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2f6f5e" />
      </View>
    );
  }

  if (!token) return <AuthStack />;
  // "=== false" rather than "!": if the app opened offline, the user's
  // details couldn't be loaded (user is null), and the app is shown as before
  if (user?.emailVerified === false) return <VerifyEmailStack />;
  return <AppTabs />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
