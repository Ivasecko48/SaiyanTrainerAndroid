import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const MealRender = ({ item, onDelete, onEdit }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.protein}</Text>
      <Text style={styles.cell}>{item.calories}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onEdit(item)}
      >
        <Feather name="edit-3" size={24} color="black" />
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
  deleteButton: {
    width: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MealRender;
