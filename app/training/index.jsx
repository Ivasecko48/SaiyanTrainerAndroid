import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import React from 'react';
import ExerciseRender from '@/components/ExerciseRender';
import AddExerciseModal from '@/components/AddExerciseModal';

const TrainingScreen = () => {
  const [exercise, setExercise] = useState([
    { id: '1', name: 'Bench Press', sets: 3, reps: 10, rpe: 8.5 },
    { id: '2', name: 'Squat', sets: 4, reps: 8, rpe: 8.5 },
    { id: '3', name: 'Deadlift', sets: 3, reps: 6, rpe: 8.5 },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newExercise, setNewExercise] = useState('');
  const [selectedReps, setSelectedReps] = useState(10);
  const [selectedSets, setSelectedSets] = useState(3);
  const [selectedRPE, setSelectedRPE] = useState(8.5);
  const [selectedWeight, setSelectedWeight] = useState('');

  // Add new Exercise

  const addExercise = () => {
    if (newExercise.trim() === '') return;

    setExercise((prevExercises) => [
      ...prevExercises,
      {
        id: Date.now().toString(),
        name: newExercise,
        sets: selectedSets,
        reps: selectedReps,
        rpe: selectedRPE,
        weight: selectedWeight,
      },
    ]);

    setNewExercise('');
    setModalVisible(false);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={styles.headerText}>Exercise</Text>
      <Text style={styles.headerText}>Sets</Text>
      <Text style={styles.headerText}>Reps</Text>
      <Text style={styles.headerText}>Rpe</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={exercise}
        renderItem={ExerciseRender}
        keyExtractor={(item) => item.id}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </TouchableOpacity>

      {/* Modal */}
      <AddExerciseModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        newExercise={newExercise}
        setNewExercise={setNewExercise}
        selectedReps={selectedReps}
        setSelectedReps={setSelectedReps}
        selectedSets={selectedSets}
        setSelectedSets={setSelectedSets}
        selectedRPE={selectedRPE}
        setSelectedRPE={setSelectedRPE}
        selectedWeight={selectedWeight}
        setSelectedWeight={setSelectedWeight}
        addExercise={addExercise}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

  header: {
    backgroundColor: '#f0f0f0',
  },

  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    bottom: 60,
    left: 25,
    right: 25,
    backgroundColor: '#fc7138',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
  },
  addButtonText: {
    color: '#0e0e0e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    marginRight: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
    flex: 1,
    height: 50,
  },
  label: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
});
export default TrainingScreen;
