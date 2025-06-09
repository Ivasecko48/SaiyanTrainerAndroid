import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const ExerciseRender = ({ item, onDelete, onEdit }) => {
  return (
    <View style={styles.row}>
      <Text onPress={() => onEdit(item)} style={styles.cell}>
        {item.name}
      </Text>
      <Text style={styles.cell}>{item.weight}</Text>
      <Text style={styles.cell}>{item.sets}</Text>
      <Text style={styles.cell}>{item.reps}</Text>
      <Text style={styles.cell}>{item.rpe}</Text>
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
  deleteButton: {
    width: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ExerciseRender;
