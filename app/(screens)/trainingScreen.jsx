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
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDate } from '@/contexts/DateContext';
import ExerciseRender from '@/components/ExerciseRender';
import AddExerciseModal from '@/components/AddExerciseModal';
import saiyanService from '@/services/saiyanService';
import { parseNumber } from '@/utils/parseNumber';

const DEFAULT_SETS = 1;
const DEFAULT_REPS = 1;
const DEFAULT_RPE = 8.5;

const TrainingScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedDate, refresh } = useDate();

  const [exercise, setExercise] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [NewExerciseName, setNewExerciseName] = useState('');
  const [selectedReps, setSelectedReps] = useState(DEFAULT_REPS);
  const [selectedSets, setSelectedSets] = useState(DEFAULT_SETS);
  const [selectedRPE, setSelectedRPE] = useState(DEFAULT_RPE);
  const [weight, setWeight] = useState('');
  //for editing
  const [editingExercise, setEditingExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchExercises();
    }
  }, [selectedDate, user]);

  const fetchExercises = async () => {
    setLoading(true);
    const response = await saiyanService.getExercises(user.$id);
    if (response.error) {
      setError(response.error);
      Alert.alert('Error', response.error);
    } else {
      let exercises = response.data;
      if (selectedDate) {
        exercises = exercises.filter((ex) => {
          const exDate = new Date(ex.createdAt).toISOString().split('T')[0];
          return exDate === selectedDate;
        });
      }
      setExercise(exercises);
      setError(null);
    }

    setLoading(false);
  };

  // Vraća formu na početno stanje
  const resetForm = () => {
    setEditingExercise(null);
    setNewExerciseName('');
    setWeight('');
    setSelectedSets(DEFAULT_SETS);
    setSelectedReps(DEFAULT_REPS);
    setSelectedRPE(DEFAULT_RPE);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  // Cancel i zatvaranje modala uvijek čiste formu, da se slučajno
  // ne uređuje prethodna vježba kad sljedeći put dodaješ novu
  const closeModal = () => {
    resetForm();
    setModalVisible(false);
  };

  // Add new Exercise / update existing
  const handleSave = async () => {
    if (NewExerciseName.trim() === '') return;
    const dateToSave = selectedDate
      ? new Date(selectedDate) // koristi selectedDate iz kalendara
      : new Date(); // današnji datum ako ništa nije odabrano
    const newData = {
      user_id: user.$id,
      createdAt: dateToSave.toISOString(),
      name: String(NewExerciseName).trim(),
      weight: parseNumber(weight), // prihvaća i "82,5"
      sets: selectedSets || DEFAULT_SETS,
      reps: selectedReps || DEFAULT_REPS,
      rpe: selectedRPE || 5.0,
    };

    if (editingExercise) {
      const response = await saiyanService.updateExercise({
        id: editingExercise.$id,
        ...newData,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      setExercise((prev) =>
        prev.map((e) => (e.$id === editingExercise.$id ? response.data : e))
      );
    } else {
      const response = await saiyanService.addExercise(newData);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      setExercise((prev) => [...prev, response.data]);
    }

    refresh(); // osvježi oznake u kalendaru
    closeModal();
  };

  //edit ex
  const openEditModal = (item) => {
    setNewExerciseName(item.name);
    setEditingExercise(item); // Save reference
    setWeight(String(item.weight ?? ''));
    setSelectedSets(item.sets);
    setSelectedReps(item.reps);
    setSelectedRPE(item.rpe);
    setModalVisible(true);
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
          const response = await saiyanService.deleteExer(id);
          if (response.error) {
            Alert.alert('Error', response.error);
          } else {
            setExercise((prev) => prev.filter((ex) => ex.$id !== id));
            refresh();
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

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Text style={styles.addButtonText}>+ Add Exercise</Text>
      </TouchableOpacity>

      {/* Modal */}
      <AddExerciseModal
        modalVisible={modalVisible}
        onClose={closeModal}
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
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
});
export default TrainingScreen;
