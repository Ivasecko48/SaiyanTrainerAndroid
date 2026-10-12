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
import TableHeader from '@/components/TableHeader';
import { EXERCISE_COLUMNS } from '@/components/tableStyles';
import AddExerciseModal from '@/components/AddExerciseModal';
import saiyanService from '@/services/saiyanService';
import { parseNumber } from '@/utils/parseNumber';
import { normalizeMuscles } from '@/utils/muscles';
import { todayKey } from '@/utils/dates';
import {
  loadCatalog,
  saveCustomExercise,
  findInCatalog,
} from '@/services/exerciseCatalog';

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
  // popis poznatih vježbi (biblioteka + vlastite) i mišići trenutne vježbe
  const [catalog, setCatalog] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
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

  useEffect(() => {
    if (user) {
      loadCatalog(user.$id).then(setCatalog);
    }
  }, [user?.$id]);

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
    setSelectedMuscles([]);
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

  // Dodir na prijedlog: popuni naziv i mišiće te vježbe
  const handleSelectExercise = (exercise) => {
    setNewExerciseName(exercise.name);
    setSelectedMuscles(normalizeMuscles(exercise.muscles));
  };

  // Tipkanje naziva: ako je naziv točno poznata vježba, a mišići još nisu odabrani, popuni ih
  const handleNameChange = (text) => {
    setNewExerciseName(text);
    if (selectedMuscles.length === 0) {
      const known = findInCatalog(catalog, text);
      if (known) setSelectedMuscles(normalizeMuscles(known.muscles));
    }
  };

  // Add new Exercise / update existing
  const handleSave = async () => {
    if (NewExerciseName.trim() === '') return;

    if (selectedMuscles.length === 0) {
      Alert.alert('Mišićne skupine', 'Odaberi barem jednu mišićnu skupinu.');
      return;
    }

    // koristi selectedDate iz kalendara, a inače današnji (lokalni) datum
    const dateToSave = new Date(selectedDate || todayKey());
    const newData = {
      user_id: user.$id,
      createdAt: dateToSave.toISOString(),
      name: String(NewExerciseName).trim(),
      muscles: selectedMuscles,
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

    // nova vlastita vježba ide u korisnikov popis (s mišićima), poznata se ažurira
    await saveCustomExercise(user.$id, {
      name: newData.name,
      muscles: newData.muscles,
    });
    setCatalog(await loadCatalog(user.$id));

    refresh(); // osvježi oznake u kalendaru
    closeModal();
  };

  //edit ex
  const openEditModal = (item) => {
    setNewExerciseName(item.name);
    setEditingExercise(item); // Save reference
    setWeight(String(item.weight ?? ''));
    // stari unosi nemaju mišiće: probaj ih pronaći po nazivu vježbe
    const own = normalizeMuscles(item.muscles);
    setSelectedMuscles(
      own.length ? own : normalizeMuscles(findInCatalog(catalog, item.name)?.muscles)
    );
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

  const renderHeader = () => <TableHeader columns={EXERCISE_COLUMNS} />;

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
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
        catalog={catalog}
        NewExerciseName={NewExerciseName}
        setNewExerciseName={handleNameChange}
        onSelectExercise={handleSelectExercise}
        selectedMuscles={selectedMuscles}
        setSelectedMuscles={setSelectedMuscles}
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
    padding: 14,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 140, // da zadnji redovi ne završe ispod gumba "+ Add"
  },
  addButton: {
    position: 'absolute',
    bottom: 60,
    left: 25,
    right: 91, // ostavlja mjesta za ikonu kalendara s desne strane
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
