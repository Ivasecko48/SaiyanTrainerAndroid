import { View, Text, TouchableOpacity } from 'react-native';
import { chipStyles as styles } from './chipStyles';

// Odabir jednog broja (serije, ponavljanja) u "oblačićima", izgleda isto kao mišićne skupine
const NumberChips = ({ options, value, onChange, labelFor = String }) => (
  <View style={styles.wrap}>
    {options.map((n) => {
      const active = value === n;
      return (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          style={[styles.chip, styles.numberChip, active && styles.chipActive]}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>
            {labelFor(n)}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default NumberChips;
