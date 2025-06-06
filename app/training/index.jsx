import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import React from 'react';
import { Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';

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

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={styles.headerText}>Exercise</Text>
      <Text style={styles.headerText}>Sets</Text>
      <Text style={styles.headerText}>Reps</Text>
      <Text style={styles.headerText}>Rpe</Text>
    </View>
  );

  const renderExercise = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.sets}</Text>
      <Text style={styles.cell}>{item.reps}</Text>
      <Text style={styles.cell}>{item.rpe}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={exercise}
        renderItem={renderExercise}
        keyExtractor={(item) => item.id}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a new exercise</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter exercise"
              placeholderTextColor="#aaa"
              value={newExercise}
              onChangeText={setNewExercise}
            />

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Weight</Text>
              <Picker
                selectedValue={selectedWeight}
                onValueChange={(itemValue) => setSelectedWeight(itemValue)}
                style={styles.input}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <Picker.Item
                    key={i}
                    label={(5 + i * 0.5).toFixed(1)}
                    value={parseFloat((5 + i * 0.5).toFixed(1))}
                  />
                ))}
              </Picker>
            </View>

            {/* RPE input */}
            <View style={styles.modalSelect}>
              <Text style={styles.label}>RPE</Text>
              <Picker
                selectedValue={selectedRPE}
                onValueChange={(itemValue) => setSelectedRPE(itemValue)}
                style={styles.input}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <Picker.Item
                    key={i}
                    label={(5 + i * 0.5).toFixed(1)}
                    value={parseFloat((5 + i * 0.5).toFixed(1))}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Reps</Text>
              <Picker
                selectedValue={selectedReps}
                onValueChange={(itemValue) => setSelectedReps(itemValue)}
                style={styles.input}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <Picker.Item
                    key={i}
                    label={(5 + i * 0.5).toFixed(1)}
                    value={parseFloat((5 + i * 0.5).toFixed(1))}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Sets</Text>
              <Picker
                selectedValue={selectedRPE}
                onValueChange={(itemValue) => setSelectedSets(itemValue)}
                style={styles.input}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <Picker.Item
                    key={i}
                    label={(5 + i * 0.5).toFixed(1)}
                    value={parseFloat((5 + i * 0.5).toFixed(1))}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    backgroundColor: '#f0f0f0',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
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
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  modalSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
  },
});
export default TrainingScreen;
