import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import RemoveButton from './RemoveButton';

/**
 * One flagged ingredient. Pass onPress to make it tappable (e.g. in the
 * ingredient search, to open its details); it then shows an arrow. Pass
 * onRemove to show a × button instead (edit mode on ResultsScreen).
 *
 * @param {{
 *   name: string,                 ingredient as written on the label
 *   sources?: string[],           lists that flag it, e.g. ["Face Reality"]
 *   matchedBy?: string[],         database names that matched, e.g. ["Coconut", "Coconut Oil"]
 *   onPress?: () => void,
 *   onRemove?: () => void,
 * }} props
 */
export default function FlaggedIngredientCard({
  name,
  sources = [],
  matchedBy = [],
  onPress,
  onRemove,
}) {
  // Only worth showing when it adds something, e.g. "Cocos Nucifera (Coconut)
  // Oil" flagged by "Coconut". Not when the only match is the name itself.
  const showMatchedBy =
    matchedBy.length > 1 ||
    (matchedBy.length === 1 && matchedBy[0].toLowerCase() !== name.toLowerCase());

  const content = (
    <>
      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        {showMatchedBy && <Text style={styles.detail}>Matches: {matchedBy.join(', ')}</Text>}
        {sources.length > 0 && <Text style={styles.detail}>Listed by: {sources.join(', ')}</Text>}
      </View>
      {onRemove ? (
        <RemoveButton label={`Remove ${name}`} onPress={onRemove} />
      ) : (
        onPress && <Ionicons name="chevron-forward" size={18} color="#999" />
      )}
    </>
  );

  if (!onPress) return <View style={styles.card}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fdf1ef',
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  detail: { fontSize: 13, color: '#555', marginTop: 4 },
});
