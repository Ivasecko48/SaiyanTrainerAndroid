import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MUSCLES } from '@/utils/muscles';

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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'orange',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#fc7138',
    borderColor: '#fc7138',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default MuscleChips;
