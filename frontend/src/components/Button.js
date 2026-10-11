import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * A full-width button.
 *
 * @param {{
 *   title: string,
 *   onPress: () => void,
 *   variant?: 'primary' | 'secondary' | 'danger',
 *   disabled?: boolean,
 * }} props
 */
export default function Button({ title, onPress, variant = 'primary', disabled = false }) {
  // Styles are looked up by variant name: styles.danger and styles.dangerText
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
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
  // For actions that delete something
  danger: { backgroundColor: '#c0392b' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  text: { fontSize: 16, fontWeight: '600' },
  primaryText: { color: '#fff' },
  secondaryText: { color: '#2f6f5e' },
  dangerText: { color: '#fff' },
});
