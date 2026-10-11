import { Modal, StyleSheet, Text, View } from 'react-native';
import Button from './Button';

/**
 * Asks the user to confirm permanently deleting their account.
 * The parent screen controls it: it decides when it's visible and what
 * happens on confirm.
 *
 * @param {{
 *   visible: boolean,
 *   deleting: boolean,         true while waiting for the server
 *   error?: string | null,
 *   onCancel: () => void,
 *   onConfirm: () => void,
 * }} props
 */
export default function DeleteAccountDialog({ visible, deleting, error, onCancel, onConfirm }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Android's back button closes the dialog (required on Android)
      onRequestClose={deleting ? () => {} : onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title}>Delete your account?</Text>
          <Text style={styles.body}>
            This permanently deletes your account and all your saved products. It can't be undone.
          </Text>

          {error && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <View style={styles.buttons}>
            <Button
              title={deleting ? 'Deleting…' : 'Delete account'}
              variant="danger"
              onPress={onConfirm}
              disabled={deleting}
            />
            <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={deleting} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  title: { fontSize: 19, fontWeight: 'bold', color: '#222' },
  body: { fontSize: 15, color: '#444', marginTop: 10, lineHeight: 21 },
  error: { color: '#c0392b', fontSize: 14, marginTop: 12 },
  buttons: { marginTop: 20, gap: 10 },
});
