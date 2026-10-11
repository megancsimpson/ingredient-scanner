import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * A search input with a magnifying glass and a clear (×) button.
 * The clear button is built here rather than using iOS's built-in one
 * (clearButtonMode), which Android doesn't have.
 *
 * @param {{
 *   value: string,
 *   onChangeText: (text: string) => void,
 *   placeholder?: string,
 * }} props
 */
export default function SearchBar({ value, onChangeText, placeholder = 'Search' }) {
  return (
    <View style={styles.bar}>
      <Ionicons name="search" size={18} color="#888" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value !== '' && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color="#888" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  // Same height on both platforms (Android adds its own padding otherwise)
  input: { flex: 1, fontSize: 16, color: '#222', paddingVertical: 10 },
});
