import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/**
 * Covers the screen with a spinner while waiting for the server.
 * Render it last inside the screen so it sits on top of everything else.
 *
 * @param {{ message?: string }} props
 */
export default function LoadingOverlay({ message = 'Loading…' }) {
  return (
    <View style={styles.overlay} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: 12, color: '#fff', fontSize: 16 },
});
