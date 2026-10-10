import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * A labeled text input with an optional error message underneath.
 * Any other props (value, onChangeText, keyboardType, ...) are passed
 * straight to the TextInput. Pass "ref" to focus it from code, e.g. to move
 * to the next field.
 *
 * Password fields (secureTextEntry) get an eye button to show or hide what
 * has been typed. They start hidden.
 *
 * @param {{ label: string, error?: string | null, ref?: any } & import('react-native').TextInputProps} props
 */
export default function TextField({ label, error, ref, style, secureTextEntry, ...inputProps }) {
  const isPassword = Boolean(secureTextEntry);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      {/* The border is on this row, so the eye button sits inside the box */}
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          accessibilityLabel={label}
          placeholderTextColor="#999"
          secureTextEntry={isPassword && hidden}
          {...inputProps}
        />
        {isPassword && (
          <Pressable
            onPress={() => setHidden((current) => !current)}
            style={styles.eyeButton}
            // Bigger tap area than the icon itself (Apple and Google both
            // recommend about 44 points)
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color="#666" />
          </Pressable>
        )}
      </View>

      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
  },
  eyeButton: { paddingHorizontal: 12, paddingVertical: 8 },
  inputError: { borderColor: '#c0392b' },
  error: { color: '#c0392b', fontSize: 13, marginTop: 4 },
});
