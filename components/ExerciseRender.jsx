import { View, Text, StyleSheet } from 'react-native';

const ExerciseRender = ({ item }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.sets}</Text>
      <Text style={styles.cell}>{item.reps}</Text>
      <Text style={styles.cell}>{item.rpe}</Text>
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
});

export default ExerciseRender;
