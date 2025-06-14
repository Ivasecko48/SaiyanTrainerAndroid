import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Modal } from 'react-native';

const AddMealModal = ({
  modalVisible,
  setModalVisible,
  mealName,
  setMealName,
  calories,
  setCalories,
  protein,
  setProtein,
  editingMeal,
  setEditingMeal,
  handleSave,
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
          <Text style={styles.modalTitle}>
            {' '}
            {editingMeal ? 'Edit Meal' : 'Add Meal'}
          </Text>
          <View style={styles.modalSelect}>
            <Text style={styles.label}>Are you even trying to get big?</Text>
            <TextInput
              style={styles.textInput}
              placeholder=">200kcals"
              keyboardType="text"
              value={mealName}
              onChangeText={setMealName}
            />
          </View>

          <View style={styles.modalSelect}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.textInput}
              placeholder=">200kcal"
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />
          </View>

          <View style={styles.modalSelect}>
            <Text style={styles.label}>Protein</Text>
            <TextInput
              style={styles.textInput}
              placeholder=">5g proto"
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
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
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
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
  label: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
});

export default AddMealModal;
