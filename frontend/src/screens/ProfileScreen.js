import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import useAuth from '../hooks/useAuth';

/**
 * Account info and log out.
 * TODO: links to FlaggingGuide and About, and Delete account
 */
export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      {/* user can briefly be null if the app opened without internet */}
      {user && (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      )}

      <Button title="Log out" variant="secondary" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  card: { paddingVertical: 16, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 20, fontWeight: '600', color: '#222' },
  email: { fontSize: 15, color: '#555', marginTop: 4 },
});
