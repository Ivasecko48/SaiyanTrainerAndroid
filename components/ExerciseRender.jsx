import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatReps } from '@/utils/reps';

const ExerciseRender = ({ item, onDelete, onEdit }) => {
  return (
    <View style={styles.row}>
      <Text onPress={() => onEdit(item)} style={styles.cell}>
        {item.name}
      </Text>
      <Text style={styles.cell}>{item.weight}</Text>
      <Text style={styles.cell}>{item.sets}</Text>
      <Text style={styles.cell}>{formatReps(item.reps)}</Text>
      <Text style={styles.cell}>{item.rpe}</Text>
      <TouchableOpacity style={styles.editButton} onPress={() => onEdit(item)}>
        <Feather name="edit-3" size={18} color="black" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.$id)}
      >
        <Text style={styles.deleteIcon}>✖️</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  deleteIcon: {
    fontSize: 16,
    textAlign: 'center',
    color: 'purple',
  },
  editButton: {
    width: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ExerciseRender;
