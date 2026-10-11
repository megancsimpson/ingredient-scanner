import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * A set of tappable "chips" where one can be selected, like radio buttons.
 * Used for picking a product category and for the sort options on the
 * Saved list. Chips wrap onto new lines when they don't fit.
 *
 * Built from plain Pressables rather than a native picker, which looks and
 * works very differently on iOS and Android.
 *
 * @param {{
 *   options: { value: string, label: string }[],
 *   selected: string | null,
 *   onSelect: (value: string | null) => void,
 *   allowDeselect?: boolean,   tapping the selected chip clears it (onSelect(null))
 *   accessibilityLabel?: string,
 * }} props
 */
export default function ChipSelect({
  options,
  selected,
  onSelect,
  allowDeselect = false,
  accessibilityLabel,
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(isSelected && allowDeselect ? null : option.value)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
            hitSlop={4}
            // Screen readers announce these as radio buttons, selected or not
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#2f6f5e', borderColor: '#2f6f5e' },
  pressed: { opacity: 0.7 },
  label: { fontSize: 14, color: '#333' },
  labelSelected: { color: '#fff', fontWeight: '600' },
});
