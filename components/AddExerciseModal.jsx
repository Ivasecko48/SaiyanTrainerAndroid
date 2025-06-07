import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import React from 'react';

const AddExerciseModal = ({
  modalVisible,
  setModalVisible,
  newExercise,
  setNewExercise,
  selectedReps,
  setSelectedReps,
  selectedSets,
  setSelectedSets,
  selectedRPE,
  setSelectedRPE,
  selectedWeight,
  setSelectedWeight,
  addExercise,
}) => {
  return (
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

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={addExercise}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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

    flex: 1,
    height: 50,
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
});

export default AddExerciseModal;
