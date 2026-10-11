import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import Disclaimer from '../components/Disclaimer';

// The version from app.json ("expo.version"), so it's never out of date here
const APP_VERSION = Constants.expoConfig?.version ?? '';

/**
 * What the app is for, where its data comes from, the full disclaimer and
 * the version. Opened from the Profile tab.
 */
export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ingredient Scanner</Text>
      {APP_VERSION !== '' && <Text style={styles.version}>Version {APP_VERSION}</Text>}

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          What it does
        </Text>
        <Text style={styles.body}>
          Ingredient Scanner checks skincare and cosmetic products for potentially pore-clogging
          ingredients. Paste or photograph an ingredient list to see which ingredients are
          flagged, save products to look back on, and search the ingredient list directly.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          Where the data comes from
        </Text>
        <Text style={styles.body}>
          The pore-clogging ingredient list was compiled by licensed estheticians at a day spa,
          from the Acne Clinic NYC and Face Reality pore-clogging ingredient lists.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading} accessibilityRole="header">
          Disclaimer
        </Text>
        <Disclaimer variant="full" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#fff' },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2f6f5e' },
  version: { fontSize: 14, color: '#666', marginTop: 4 },
  section: { marginTop: 24 },
  heading: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 6 },
  body: { fontSize: 15, color: '#444', lineHeight: 22 },
});
