import { StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';

/**
 * Start of the Scan tab: choose between taking a photo or pasting a list.
 */
export default function ScanHomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check a product</Text>
      <Text style={styles.subtitle}>
        Find potentially pore-clogging ingredients in any skincare or cosmetic product.
      </Text>

      <View style={styles.buttons}>
        <Button title="Take a photo" onPress={() => navigation.navigate('Camera')} />
        <Button
          title="Paste ingredient list"
          variant="secondary"
          onPress={() => navigation.navigate('ReviewText', { source: 'paste' })}
        />
      </View>

      {/* Shown before choosing, so people with a round bottle go straight to
          pasting instead of fighting with the camera. The longer version is
          in FlaggingGuideScreen. */}
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          <Text style={styles.tipStrong}>Tip:</Text> photos work best when the whole list fits in
          one shot, like on a flat box. For round bottles, paste the list instead.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#222' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 8, lineHeight: 22 },
  buttons: { marginTop: 32, gap: 12 },
  // Same light green as the edit banner on ResultsScreen
  tip: { marginTop: 24, backgroundColor: '#eef6f3', borderRadius: 10, padding: 14 },
  tipText: { fontSize: 14, color: '#2f4f46', lineHeight: 20 },
  tipStrong: { fontWeight: '600' },
});
