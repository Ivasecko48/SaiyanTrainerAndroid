import { useState, useEffect, useMemo } from 'react';
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
import DayHeader, { RangeLabel } from '@/components/DayHeader';
import { EXERCISE_COLUMNS } from '@/components/tableStyles';
import AddExerciseModal from '@/components/AddExerciseModal';
import saiyanService from '@/services/saiyanService';
import { parseNumber } from '@/utils/parseNumber';
import { normalizeMuscles } from '@/utils/muscles';
import { inRange, withDayHeaders } from '@/utils/dates';
import { totalVolume, formatVolume } from '@/utils/volume';
import { buildWeeklyReport } from '@/utils/weeklyReport';
import WeeklyReportCard from '@/components/WeeklyReportCard';
import ShareDayModal from '@/components/ShareDayModal';
import SuperSaiyanModal, { SuperSaiyanButton } from '@/components/SuperSaiyanModal';
import { useTourTarget } from '@/contexts/TourContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadCatalog,
  saveCustomExercise,
  findInCatalog,
} from '@/services/exerciseCatalog';

const VOLUME_LABELS = {
  day: 'Ukupni volumen dana',
  week: 'Ukupni volumen tjedna',
  month: 'Ukupni volumen mjeseca',
  all: 'Ukupni volumen',
};

// Tjedni izvještaj zatvoren za tjedan (ključ = početak prošlog tjedna), po korisniku
const reportDismissKey = (userId) => `WEEKLY_REPORT_DISMISSED:${userId}`;

const DEFAULT_SETS = 1;
const DEFAULT_REPS = 1;
const DEFAULT_RPE = 8.5;

const TrainingScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedDate, range, mode, rangeLabel, entryDate, refresh } = useDate();
  // Pregled i dijeljenje dana kao slike
  const [shareOpen, setShareOpen] = useState(false);
  // Super Saiyan zafrkancija (verzija 2), otvara se azurnim mikrofonom
  const [superSaiyanOpen, setSuperSaiyanOpen] = useState(false);
  const addTourRef = useTourTarget('add-exercise');

  // Sve vježbe korisnika; prikazuju se samo one u odabranom rasponu
  const [exercise, setExercise] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [NewExerciseName, setNewExerciseName] = useState('');
  const [selectedReps, setSelectedReps] = useState(DEFAULT_REPS);
  const [selectedSets, setSelectedSets] = useState(DEFAULT_SETS);
  const [selectedRPE, setSelectedRPE] = useState(DEFAULT_RPE);
  const [weight, setWeight] = useState('');
  // popis poznatih vježbi (biblioteka + vlastite) i mišići trenutne vježbe
  const [catalog, setCatalog] = useState([]);
  // Za tjedni izvještaj: obroci i tjedan čiji je izvještaj zatvoren
  const [reportMeals, setReportMeals] = useState([]);
  const [dismissedWeek, setDismissedWeek] = useState(null);
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
  }, [range?.start, range?.end, user]);

  // Jedan dan: samo vježbe; više dana: vježbe s naslovom (i volumenom) svakog dana.
  // Ukupni volumen je zbroj svih prikazanih vježbi.
  const { rows, volume, visible } = useMemo(() => {
    const visible = exercise.filter((ex) => inRange(ex.createdAt, range));
    return {
      rows:
        mode === 'day'
          ? visible
          : withDayHeaders(visible, mode === 'all', (dayItems) =>
              formatVolume(totalVolume(dayItems)),
            ),
      volume: totalVolume(visible),
      visible,
    };
  }, [exercise, range, mode]);

  useEffect(() => {
    if (user) {
      loadCatalog(user.$id).then(setCatalog);

      // Obroci i zatvoreni izvještaj trebaju samo tjednom izvještaju
      saiyanService.getMeals(user.$id).then((response) => setReportMeals(response.data || []));
      AsyncStorage.getItem(reportDismissKey(user.$id))
        .then(setDismissedWeek)
        .catch(() => setDismissedWeek(null));
    }
  }, [user?.$id]);

  const fetchExercises = async () => {
    setLoading(true);
    const response = await saiyanService.getExercises(user.$id);
    if (response.error) {
      setError(response.error);
      Alert.alert('Error', response.error);
    } else {
      setExercise(response.data);
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

    // odabrani dan iz kalendara (kod tjedna i svih dana obično današnji)
    const dateToSave = new Date(entryDate);
    const newData = {
      user_id: user.$id,
      createdAt: dateToSave.toISOString(),
      name: String(NewExerciseName).trim(),
      muscles: selectedMuscles,
      weight: parseNumber(weight), // prihvaća i "82,5"
      sets: selectedSets || DEFAULT_SETS,
      reps: selectedReps || DEFAULT_REPS,
      rpe: selectedRPE || 7.0,
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
        prev.map((e) => (e.$id === editingExercise.$id ? response.data : e)),
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
      own.length
        ? own
        : normalizeMuscles(findInCatalog(catalog, item.name)?.muscles),
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

  // Tjedni izvještaj o prošlom tjednu: proteini, netrenirani mišići i intenzitet (RPE)
  const report = useMemo(
    () =>
      buildWeeklyReport({
        exercises: exercise,
        meals: reportMeals,
        profile: user?.prefs?.profile,
        lookupByName: (name) => findInCatalog(catalog, name)?.muscles,
      }),
    [exercise, reportMeals, user?.prefs?.profile, catalog]
  );
  const showReport = Boolean(report) && dismissedWeek !== report.weekKey;

  // Zatvoreni izvještaj se ne prikazuje do idućeg tjedna
  const dismissReport = () => {
    setDismissedWeek(report.weekKey);
    AsyncStorage.setItem(reportDismissKey(user.$id), report.weekKey).catch(() => {});
  };

  const renderHeader = () => (
    <>
      {showReport && <WeeklyReportCard report={report} onDismiss={dismissReport} />}
      <TableHeader columns={EXERCISE_COLUMNS} />
    </>
  );

  // Na dnu tablice: ukupni volumen prikazanog dana / tjedna / mjeseca
  const renderFooter = () =>
    rows.length > 0 ? (
      <View style={styles.volumeTotal}>
        <Text style={styles.volumeLabel}>{VOLUME_LABELS[mode]}</Text>
        <Text style={styles.volumeValue}>{formatVolume(volume)}</Text>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {/* Dijeli se samo jedan dan, i samo ako ima vježbi */}
      <RangeLabel
        label={rangeLabel}
        onShare={mode === 'day' && visible.length > 0 ? () => setShareOpen(true) : undefined}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#fc7138" />
      ) : (
        <>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <FlatList
            data={rows}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) =>
              item.type === 'day' ? (
                <DayHeader label={item.label} extra={item.extra} />
              ) : (
                <ExerciseRender
                  item={item}
                  onDelete={deleteExercise}
                  onEdit={openEditModal}
                />
              )
            }
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <View style={styles.addRow}>
        <TouchableOpacity ref={addTourRef} style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Exercise</Text>
        </TouchableOpacity>
        <SuperSaiyanButton
          icon="mic"
          label="Trening govorom (verzija 2)"
          onPress={() => setSuperSaiyanOpen(true)}
        />
      </View>

      {/* Modal */}
      <SuperSaiyanModal
        visible={superSaiyanOpen}
        onClose={() => setSuperSaiyanOpen(false)}
      />
      <ShareDayModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        type="training"
        items={visible}
        dayKey={selectedDate}
        username={user?.name}
        avatar={user?.prefs?.avatar}
      />

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
  addRow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 91, // ostavlja mjesta za ikonu kalendara s desne strane
    flexDirection: 'row',
  },
  addButton: {
    flex: 1,
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
  volumeTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3ec',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#65617e',
  },
  volumeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fc7138',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
});
export default TrainingScreen;
