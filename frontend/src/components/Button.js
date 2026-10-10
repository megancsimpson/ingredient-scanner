import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * A full-width button.
 *
 * @param {{
 *   title: string,
 *   onPress: () => void,
 *   variant?: 'primary' | 'secondary',
 *   disabled?: boolean,
 * }} props
 */
export default function Button({ title, onPress, variant = 'primary', disabled = false }) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, isPrimary ? styles.primaryText : styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  primary: { backgroundColor: '#2f6f5e' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2f6f5e' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  text: { fontSize: 16, fontWeight: '600' },
  primaryText: { color: '#fff' },
  secondaryText: { color: '#2f6f5e' },
});
