import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ExerciseAutocompleteInput from './ExerciseAutoInput';

// Vrijednost svake stavke jednaka je broju koji piše na njoj (1, 2, 3...)
const SETS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const REPS_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);
const RPE_OPTIONS = Array.from({ length: 11 }, (_, i) => 5 + i * 0.5);

const AddExerciseModal = ({
  modalVisible,
  onClose,
  NewExerciseName,
  setNewExerciseName,
  selectedReps,
  setSelectedReps,
  selectedSets,
  setSelectedSets,
  selectedRPE,
  setSelectedRPE,
  weight,
  setWeight,
  editingExercise,
  handleSave,
}) => {
  return (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {' '}
            {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
          </Text>
          <View style={styles.modalSelect}>
            <Text style={styles.label}>Naziv vježbe</Text>
          </View>
          <ExerciseAutocompleteInput
            value={NewExerciseName}
            onChange={setNewExerciseName}
          />
          <View style={styles.modalSelect}>
            <Text style={styles.label}>Weight</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Weight in kgs"
              placeholderTextColor="#888"
              keyboardType="decimal-pad"
              value={String(weight ?? '')}
              onChangeText={setWeight}
            />
          </View>

          <View style={styles.modalSelect}>
            <Text style={styles.label}>Sets</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedSets}
                onValueChange={(itemValue) => setSelectedSets(itemValue)}
                style={styles.input}
              >
                {SETS_OPTIONS.map((n) => (
                  <Picker.Item key={n} label={String(n)} value={n} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.modalSelect}>
            <Text style={styles.label}>Reps</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedReps}
                onValueChange={(itemValue) => setSelectedReps(itemValue)}
                style={styles.input}
              >
                {REPS_OPTIONS.map((n) => (
                  <Picker.Item key={n} label={String(n)} value={n} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.modalSelect}>
            <Text style={styles.label}>RPE</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedRPE}
                onValueChange={(itemValue) => setSelectedRPE(itemValue)}
                style={styles.input}
              >
                {RPE_OPTIONS.map((n) => (
                  <Picker.Item key={n} label={n.toFixed(1)} value={n} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '84%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'orange',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
    marginRight: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 30,
    left: 20,
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
  input: {
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
    width: 80,
    height: 50,
    textAlign: 'center',
  },
  pickerWrapper: {
    paddingLeft: 50,
    width: 60,
    minHeight: 40,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'orange',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden', // da zaobljeni rubovi izgledaju uredno
    justifyContent: 'center', // vertikalno centriranje
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
});

export default AddExerciseModal;
