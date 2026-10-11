import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * A tappable row in a menu, with an optional icon and an arrow.
 *
 * @param {{
 *   label: string,
 *   icon?: string,          an Ionicons name, e.g. "flag-outline"
 *   onPress: () => void,
 * }} props
 */
export default function MenuRow({ label, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      {icon && <Ionicons name={icon} size={22} color="#2f6f5e" />}
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  pressed: { opacity: 0.6 },
  // flex: 1 pushes the arrow to the right edge
  label: { flex: 1, fontSize: 16, color: '#222' },
});
