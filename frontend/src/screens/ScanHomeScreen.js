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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#222' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 8, lineHeight: 22 },
  buttons: { marginTop: 32, gap: 12 },
});
