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
import { findFood } from '@/services/foodCatalog';

const AddMealModal = ({
  modalVisible,
  onClose,
  catalog,
  mealName,
  setMealName,
  onSelectFood,
  grams,
  setGrams,
  calories,
  setCalories,
  protein,
  setProtein,
  editingMeal,
  handleSave,
}) => {
  const isNewName =
    mealName.trim().length > 0 && !findFood(catalog, mealName);

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
            {editingMeal ? 'Edit Meal' : 'Add Meal'}
          </Text>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSelect}>
              <Text style={styles.label}>Are you even trying to get big?</Text>
            </View>
            <ExerciseAutocompleteInput
              value={mealName}
              onChange={setMealName}
              onSelect={onSelectFood}
              catalog={catalog}
              placeholder="Jesi li jeo?"
              groupKey="category"
            />
            {isNewName && (
              <Text style={styles.hint}>
                Nova namirnica: spremit će se u tvoj popis.
              </Text>
            )}

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Grami</Text>
              <TextInput
                style={styles.textInput}
                placeholder="100 g"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(grams ?? '')}
                onChangeText={setGrams}
              />
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Calories</Text>
              <TextInput
                style={styles.textInput}
                placeholder=">200kcal"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(calories ?? '')}
                onChangeText={setCalories}
              />
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Protein</Text>
              <TextInput
                style={styles.textInput}
                placeholder=">10g proto"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(protein ?? '')}
                onChangeText={setProtein}
              />
            </View>
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
    width: '84%',
    maxHeight: '80%',
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
    width: 110,
    borderWidth: 1,
    borderColor: '#ccc',
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
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
});

export default AddMealModal;
