import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Disclaimer from '../components/Disclaimer';
import { TEXT_WRAP_FIX } from '../utils/textWrapFix';

// Each section of the guide: a heading, one or more paragraphs, and an
// optional bulleted list shown after the paragraphs.
// Kept as data so the wording is easy to update in one place.
const SECTIONS = [
  {
    heading: 'What a flag means',
    paragraphs: [
      'A flagged ingredient appears on a list of ingredients with pore-clogging (comedogenic) potential. A flag does not mean the ingredient will clog your pores. Everyone’s skin is different, and many people use products containing these ingredients without any issues.',
      'A flag is also not a judgment of the product. Not everyone is prone to acne or congestion, and a product that contains flagged ingredients may still be a good choice for your skin.',
      'Flags are most useful for:',
    ],
    bullets: [
      'Identifying ingredients your skin may react to, by comparing the products you save.',
      'Avoiding these ingredients altogether if your skin is acne-prone or very sensitive.',
    ],
  },
  {
    heading: 'Ratings',
    paragraphs: ['Ingredients are either flagged or not. There is no rating or score.'],
  },
  {
    heading: 'Where the list comes from',
    paragraphs: [
      'The list was compiled by licensed estheticians from the Acne Clinic NYC and Face Reality pore-clogging ingredient lists. Each flagged ingredient shows which list(s) include it.',
    ],
  },
  {
    heading: 'How ingredients are matched',
    paragraphs: [
      'Ingredient names are compared without capitals or punctuation, so "D&C Red 17" and "D & C Red # 17" match.',
      'Some entries are keywords, such as "Coconut" or "Myristate". These flag any ingredient that contains the word: "Coconut" flags "Cocos Nucifera (Coconut) Oil" and "Coconut Alkanes".',
      'Only whole words match, so "Laureth-4" does not flag "Laureth-40".',
    ],
  },
  {
    heading: '"Non pore-clogging" products',
    paragraphs: [
      'On the Saved tab, "Non pore-clogging" shows products where no ingredient from the list was found.',
    ],
  },
  {
    heading: 'Getting accurate results',
    paragraphs: [
      'Photos work best when the whole ingredient list fits in one shot, like on the back of a flat box. For round bottles and tubes, or lists that wrap around the container, paste the list instead. You can usually copy it from the brand’s or store’s website.',
      'Check the ingredient text before analyzing it. A misread or misspelled ingredient can be missed.',
      'Results show whether an ingredient is present, not how much of it there is or how the product is made, which also affect how it works on your skin.',
    ],
  },
];

/**
 * Explains how flagging works. Opened from the Profile tab.
 */
export default function FlaggingGuideScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {section.heading}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.body}>
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              {/* The bullet is its own Text so wrapped lines line up with
                  the text, not under the bullet */}
              <Text style={styles.body}>•</Text>
              <Text style={[styles.body, styles.bulletText]}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#fff' },
  container: { padding: 20, paddingTop: 4 },
  section: { marginTop: 20 },
  heading: { fontSize: 17, fontWeight: '600', color: '#222', marginBottom: 6 },
  // A long page, so paragraphs can sit far down it (see textWrapFix.js)
  body: { fontSize: 15, color: '#444', lineHeight: 22, marginBottom: 8, ...TEXT_WRAP_FIX },
  bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  bulletText: { flex: 1 },
});
