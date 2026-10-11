import { View, Text, TouchableOpacity } from 'react-native';
import { MUSCLES } from '@/utils/muscles';
import { chipStyles as styles } from './chipStyles';

// Odabir jedne ili više mišićnih skupina (dodir uključuje / isključuje skupinu)
const MuscleChips = ({ selected = [], onChange }) => {
  const toggle = (key) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <View style={styles.wrap}>
      {MUSCLES.map(({ key, label }) => {
        const active = selected.includes(key);
        return (
          <TouchableOpacity
            key={key}
            onPress={() => toggle(key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default MuscleChips;
