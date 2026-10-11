import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import DeleteAccountDialog from '../components/DeleteAccountDialog';
import MenuRow from '../components/MenuRow';
import useAuth from '../hooks/useAuth';

/**
 * Account info, links to the flagging guide and About, log out and delete
 * account.
 */
export default function ProfileScreen({ navigation }) {
  const { user, logout, deleteAccount } = useAuth();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  function openDialog() {
    setDeleteError(null);
    setDialogVisible(true);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      // On success the app returns to the login screen by itself, and this
      // screen (with the dialog) disappears
      await deleteAccount();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* user can briefly be null if the app opened without internet */}
      {user && (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      )}

      <View style={styles.menu}>
        <MenuRow
          label="How flagging works"
          icon="flag-outline"
          onPress={() => navigation.navigate('FlaggingGuide')}
        />
        <MenuRow
          label="About"
          icon="information-circle-outline"
          onPress={() => navigation.navigate('About')}
        />
      </View>

      <Button title="Log out" variant="secondary" onPress={logout} />

      {/* Kept apart from the other buttons so it isn't tapped by accident */}
      <View style={styles.dangerZone}>
        <Button title="Delete account" variant="danger" onPress={openDialog} />
      </View>

      <DeleteAccountDialog
        visible={dialogVisible}
        deleting={deleting}
        error={deleteError}
        onCancel={() => setDialogVisible(false)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  card: { paddingVertical: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menu: { marginBottom: 24 },
  name: { fontSize: 20, fontWeight: '600', color: '#222' },
  email: { fontSize: 15, color: '#555', marginTop: 4 },
  dangerZone: { marginTop: 'auto', paddingTop: 24 },
});
