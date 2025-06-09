import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ExerciseRender from '@/components/ExerciseRender';
import AddExerciseModal from '@/components/AddExerciseModal';
import saiyanService from '@/services/saiyanService';

const TrainingScreen = () => {
  const [exercise, setExercise] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [NewExerciseName, setNewExerciseName] = useState('');
  const [selectedReps, setSelectedReps] = useState(10);
  const [selectedSets, setSelectedSets] = useState(3);
  const [selectedRPE, setSelectedRPE] = useState(8.5);
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  //for editing
  const [editingExercise, setEditingExercise] = useState(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const response = await saiyanService.getExercises();

    if (response.error) {
      setError(response.error);
      Alert.alert('ERror', response.error);
    } else {
      setExercise(response.data);
      setError(null);
    }

    setLoading(false);
  };
  // Add new Exercise

  const handleSave = async () => {
    if (NewExerciseName.trim() === '') return;
    const newData = {
      name: String(NewExerciseName).trim(),
      weight: parseFloat(weight), // Ensure number
      sets: selectedSets,
      reps: selectedReps,
      rpe: selectedRPE,
    };
    if (editingExercise) {
      // Update existing
      const updated = { ...editingExercise, name: NewExerciseName };
      const response = await saiyanService.updateExercise(
        editingExercise.$id,
        updated
      );
      if (!response.error) {
        setExercise((prev) =>
          prev.map((e) => (e.$id === editingExercise.$id ? response.data : e))
        );
      }
    } else {
      console.log('Submitting:', newData, typeof newData.name);

      const response = await saiyanService.addExercise(newData);

      if (response.error) {
        Alert.alert('error', response.error);
      } else {
        setExercise([...exercise, response.data]);
      }
    }

    setEditingExercise(null);
    setNewExerciseName('');
    setModalVisible(false);
  };

  //edit ex

  const openEditModal = (exercise) => {
    console.log('Opening modal to edit:', exercise);
    setNewExerciseName(exercise.name); // Or whole object if you're editing more fields
    setEditingExercise(exercise); // Save reference
    setModalVisible(true);
    console.log('Editing exercise3:', editingExercise);
  };

  //delete ex
  const deleteExercise = async (id) => {
    Alert.alert('Delete Exercise', 'Are you sure you want to delete?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const response = await saiyanService.deleteExercise(id);
          if (response.error) {
            Alert.alert('error', response.error);
          } else {
            setExercise(exercise.filter((exercise) => exercise.$id !== id));
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={[styles.row, styles.header]}>
      <Text style={styles.headerText}>Exercise</Text>
      <Text style={styles.headerText}>Kgs</Text>
      <Text style={styles.headerText}>Sets</Text>
      <Text style={styles.headerText}>Reps</Text>
      <Text style={styles.headerText}>Rpe</Text>
      <Text style={styles.deleteCell}></Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#fc7138" />
      ) : (
        <>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <FlatList
            data={exercise}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <ExerciseRender
                item={item}
                onDelete={deleteExercise}
                onEdit={openEditModal}
              />
            )}
            ListHeaderComponent={renderHeader}
          />
        </>
      )}

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
        NewExerciseName={NewExerciseName}
        setNewExerciseName={setNewExerciseName}
        selectedReps={selectedReps}
        setSelectedReps={setSelectedReps}
        selectedSets={selectedSets}
        setSelectedSets={setSelectedSets}
        selectedRPE={selectedRPE}
        setSelectedRPE={setSelectedRPE}
        weight={weight}
        setWeight={setWeight}
        editingExercise={editingExercise}
        setEditingExercise={setEditingExercise}
        handleSave={handleSave}
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
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderColor: '#ddd',
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
  deleteCell: {
    width: 15,
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
});
export default TrainingScreen;
