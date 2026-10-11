import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getCategoryLabel } from '../utils/categories';
import { formatDate } from '../utils/formatDate';

/**
 * One saved product in the list.
 *
 * @param {{
 *   productName: string,
 *   brand?: string,
 *   category?: string,     category code, shown by its display name
 *   flaggedCount: number,
 *   createdAt: string,
 *   onPress: () => void,
 * }} props
 */
export default function SavedProductRow({
  productName,
  brand,
  category,
  flaggedCount,
  createdAt,
  onPress,
}) {
  const flaggedText = flaggedCount === 0 ? 'No flags' : `${flaggedCount} flagged`;
  // e.g. "Acme · Moisturizer · Oct 10, 2026", skipping anything missing
  const details = [brand, getCategoryLabel(category), formatDate(createdAt)].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={[productName, ...details, flaggedText].join(', ')}
    >
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {productName}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {details.join(' · ')}
        </Text>
      </View>

      <View style={[styles.badge, flaggedCount > 0 ? styles.badgeFlagged : styles.badgeClear]}>
        <Text style={[styles.badgeText, flaggedCount > 0 && styles.badgeTextFlagged]}>
          {flaggedText}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#999" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  pressed: { backgroundColor: '#f5f5f5' },
  // flex: 1 lets the text take the leftover space and cut off long names
  // with "…" instead of pushing the badge off screen
  text: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  detail: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeFlagged: { backgroundColor: '#fdf1ef' },
  badgeClear: { backgroundColor: '#eef6f3' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#2f6f5e' },
  badgeTextFlagged: { color: '#c0392b' },
});
