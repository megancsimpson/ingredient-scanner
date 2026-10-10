import { ActivityIndicator, StyleSheet, View } from 'react-native';
import useAuth from '../hooks/useAuth';
import AppTabs from './AppTabs';
import AuthStack from './AuthStack';

/**
 * Chooses which part of the app to show: the login screens when logged out,
 * the tabs when logged in. Logging in or out changes the token, which
 * re-renders this and switches the whole app. App screens can't be reached
 * while logged out because they aren't rendered at all.
 */
export default function RootNavigator() {
  const { token, isLoading } = useAuth();

  // Checking for a saved login when the app opens
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2f6f5e" />
      </View>
    );
  }

  return token ? <AppTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
