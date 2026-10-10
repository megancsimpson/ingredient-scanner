import { StyleSheet, Text, View } from 'react-native';

const SHORT_TEXT =
  'For information only. This is not medical advice; ask a licensed esthetician or dermatologist about your skin.';

const FULL_TEXT =
  'Ingredient Scanner is an informational tool. It checks ingredient lists against a list ' +
  'of potentially pore-clogging ingredients compiled by licensed estheticians, but it can ' +
  'miss ingredients (for example if a label is misread) and it does not account for ' +
  'concentrations or how a product is formulated. A flagged ingredient will not cause ' +
  'breakouts for everyone, and a product with no flags may still affect your skin. It ' +
  'does not replace advice from a licensed esthetician or dermatologist.';

/**
 * The "information only" notice. Use the short version on ResultsScreen and
 * the full version on AboutScreen.
 *
 * @param {{ variant?: 'short' | 'full' }} props
 */
export default function Disclaimer({ variant = 'short' }) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{variant === 'full' ? FULL_TEXT : SHORT_TEXT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#f2f2f2', borderRadius: 8, padding: 12 },
  text: { fontSize: 13, color: '#555', lineHeight: 18 },
});
