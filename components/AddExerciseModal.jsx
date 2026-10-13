import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Modal } from 'react-native';
import ExerciseAutocompleteInput from './ExerciseAutoInput';
import MuscleChips from './MuscleChips';
import NumberChips from './NumberChips';
import { REPS_OPTIONS, formatReps } from '@/utils/reps';
import { findInCatalog } from '@/services/exerciseCatalog';

// Vrijednost svake stavke jednaka je broju koji piše na njoj (1, 2, 3...)
const SETS_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const RPE_OPTIONS = Array.from({ length: 11 }, (_, i) => 5 + i * 0.5);

const AddExerciseModal = ({
  modalVisible,
  onClose,
  catalog,
  NewExerciseName,
  setNewExerciseName,
  onSelectExercise,
  selectedMuscles,
  setSelectedMuscles,
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
  const isNewName =
    NewExerciseName.trim().length > 0 &&
    !findInCatalog(catalog, NewExerciseName);

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

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSelect}>
              <Text style={styles.label}>Naziv vježbe</Text>
            </View>
            <ExerciseAutocompleteInput
              value={NewExerciseName}
              onChange={setNewExerciseName}
              onSelect={onSelectExercise}
              catalog={catalog}
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

            <Text style={styles.sectionLabel}>Sets</Text>
            <View style={styles.chipBlock}>
              <NumberChips
                options={SETS_OPTIONS}
                value={selectedSets}
                onChange={setSelectedSets}
              />
            </View>

            <Text style={styles.sectionLabel}>Reps</Text>
            <View style={styles.chipBlock}>
              <NumberChips
                options={REPS_OPTIONS}
                value={selectedReps}
                onChange={setSelectedReps}
                labelFor={formatReps}
              />
            </View>

            <Text style={styles.sectionLabel}>RPE</Text>
            <View style={styles.chipBlock}>
              <NumberChips
                options={RPE_OPTIONS}
                value={selectedRPE}
                onChange={setSelectedRPE}
                labelFor={(n) => n.toFixed(1)}
              />
            </View>

            <Text style={styles.sectionLabel}>
              Mišićne skupine (barem jedna)
            </Text>
            {isNewName && (
              <Text style={styles.hint}>
                Nova vježba: odaberi mišiće koje radi, spremit će se u tvoj
                popis.
              </Text>
            )}
            <MuscleChips
              selected={selectedMuscles}
              onChange={setSelectedMuscles}
            />
          </ScrollView>

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
    width: '88%',
    maxHeight: '88%',
  },
  body: {
    flexGrow: 0,
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
    marginTop: 14,
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
  sectionLabel: {
    fontSize: 16,
    marginTop: 4,
    marginBottom: 6,
  },
  chipBlock: {
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
});

export default AddExerciseModal;
