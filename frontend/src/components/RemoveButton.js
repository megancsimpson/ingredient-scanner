import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * A small × button for removing an item from a list.
 *
 * @param {{ label: string, onPress: () => void }} props
 *   label: what's being removed, for screen readers ("Remove Water")
 */
export default function RemoveButton({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      // The icon is small, so the tap area is made bigger (about 44 points,
      // the minimum Apple and Google recommend)
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="close-circle" size={22} color="#999" />
    </Pressable>
  );
}
