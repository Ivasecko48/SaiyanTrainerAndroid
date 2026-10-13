import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import saiyanService from '@/services/saiyanService';
import { loadCatalog, findInCatalog } from '@/services/exerciseCatalog';
import BodyFigure from '@/components/BodyFigure';
import MuscleExercisesSheet from '@/components/MuscleExercisesSheet';
import WorkoutPlanSheet from '@/components/WorkoutPlanSheet';
import { generateWorkout } from '@/utils/workoutGenerator';
import {
  MUSCLES,
  colorForCount,
  COLOR_NONE,
  COLOR_ONCE,
  COLOR_TWICE,
} from '@/utils/muscles';
import { computeWeek, exercisesForMuscle } from '@/utils/muscleStats';
import { hitTestMuscle } from '@/utils/bodyHitTest';
import { formatShort } from '@/utils/dates';

const MuscleScreen = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [exercises, setExercises] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [side, setSide] = useState('front'); // 'front' | 'back'
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Generirani trening za mišiće koji su ovaj tjedan crveni (i žuti, ako stane)
  const [plan, setPlan] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  // Svaki put kad se tab otvori, ponovo učitaj podatke (vježbe su se mogle promijeniti)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      let active = true;
      const load = async () => {
        setLoading(true);
        const [response, loadedCatalog] = await Promise.all([
          saiyanService.getExercises(user.$id),
          loadCatalog(user.$id),
        ]);

        if (!active) return;

        if (response.error) {
          setError(response.error);
        } else {
          setExercises(response.data);
          setError(null);
        }
        setCatalog(loadedCatalog);
        setLoading(false);
      };

      load();
      return () => {
        active = false;
      };
    }, [user?.$id])
  );

  const { counts, unassigned, range } = useMemo(
    () =>
      computeWeek(
        exercises,
        (name) => findInCatalog(catalog, name)?.muscles
      ),
    [exercises, catalog]
  );

  const colors = useMemo(() => {
    const result = {};
    MUSCLES.forEach(({ key }) => {
      result[key] = colorForCount(counts[key]);
    });
    return result;
  }, [counts]);

  // Vježbe za odabranu skupinu (katalog + ono što je korisnik već unosio)
  const muscleExercises = useMemo(
    () =>
      selectedMuscle
        ? exercisesForMuscle(selectedMuscle, catalog, exercises)
        : [],
    [selectedMuscle, catalog, exercises]
  );

  const handleGenerate = () => {
    setPlan(generateWorkout({ counts, catalog, exercises }));
    setPlanOpen(true);
  };

  const openMuscle = (key) => {
    setSelectedMuscle(key);
    setSheetOpen(true);
  };

  const flip = () =>
    setSide((current) => (current === 'front' ? 'back' : 'front'));

  // Dodir na mišić otvara popis vježbi, a dodir na prazno mjesto okreće tijelo
  const handleFigurePress = (point) => {
    const key = point ? hitTestMuscle(side, point.x, point.y) : null;
    if (key) openMuscle(key);
    else flip();
  };

  return (
    <View style={styles.container}>
      <View style={styles.weekRow}>
        <Text style={styles.week}>
          Tjedan {formatShort(range.startDate)} – {formatShort(range.endDate)}
        </Text>
        {loading && <ActivityIndicator size="small" color="#fc7138" />}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.row}>
        <View style={styles.figure}>
          <BodyFigure colors={colors} side={side} onPress={handleFigurePress} />
          <Pressable style={styles.flipButton} onPress={flip}>
            <Feather name="rotate-cw" size={14} color="#fc7138" />
            <Text style={styles.flipText}>
              {side === 'front' ? 'Prednja strana' : 'Stražnja strana'} · okreni
            </Text>
          </Pressable>
          <Text style={styles.caption}>Dodirni mišić za popis vježbi</Text>
        </View>

        <ScrollView
          style={styles.side}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sideContent}
        >
          <View style={styles.legend}>
            <LegendItem color={COLOR_NONE} text="Nije odrađeno" />
            <LegendItem color={COLOR_ONCE} text="Odrađeno 1×" />
            <LegendItem color={COLOR_TWICE} text="Odrađeno 2× ili više" />
          </View>

          {MUSCLES.map(({ key, label }) => (
            <Pressable
              key={key}
              style={styles.muscleRow}
              onPress={() => openMuscle(key)}
            >
              <View style={[styles.dot, { backgroundColor: colors[key] }]} />
              <Text style={styles.muscleLabel}>{label}</Text>
              <Text style={styles.muscleCount}>{counts[key]}×</Text>
              <Feather name="chevron-right" size={16} color="#bbb" />
            </Pressable>
          ))}

          {unassigned > 0 && (
            <Text style={styles.note}>
              {unassigned} unosa ovog tjedna nema mišićnu skupinu pa se ne
              računaju. Otvori ih u tabu s vježbama i spremi ih ponovo.
            </Text>
          )}

          <Text style={styles.footnote}>
            Računa se broj različitih dana treninga u tjednu (pon – ned).
          </Text>
        </ScrollView>
      </View>

      <Pressable
        style={[styles.generateButton, loading && styles.generateDisabled]}
        onPress={handleGenerate}
        disabled={loading}
      >
        <Feather name="zap" size={18} color="#fff" />
        <Text style={styles.generateText}>Generiraj trening</Text>
      </Pressable>

      <WorkoutPlanSheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        onRegenerate={handleGenerate}
        plan={plan}
        counts={counts}
      />

      <MuscleExercisesSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        muscleKey={selectedMuscle}
        color={selectedMuscle ? colors[selectedMuscle] : '#fff'}
        count={selectedMuscle ? counts[selectedMuscle] : 0}
        exercises={muscleExercises}
      />
    </View>
  );
};

const LegendItem = ({ color, text }) => (
  <View style={styles.legendItem}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fc7138',
    borderRadius: 8,
    paddingVertical: 13,
    marginTop: 10,
    elevation: 3,
  },
  generateDisabled: {
    opacity: 0.6,
  },
  generateText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  week: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#65617e',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  figure: {
    flex: 1.25,
  },
  flipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'orange',
  },
  flipText: {
    fontSize: 12,
    color: '#fc7138',
    fontWeight: '600',
  },
  caption: {
    textAlign: 'center',
    fontSize: 11,
    color: '#888',
    paddingTop: 4,
  },
  side: {
    flex: 1,
  },
  sideContent: {
    paddingBottom: 12,
  },
  legend: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  muscleLabel: {
    flex: 1,
    fontSize: 14,
  },
  muscleCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#65617e',
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#b45309',
  },
  footnote: {
    marginTop: 10,
    fontSize: 11,
    color: '#888',
  },
  errorText: {
    color: 'red',
    marginBottom: 6,
  },
});

export default MuscleScreen;
