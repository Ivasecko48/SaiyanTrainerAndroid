import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MUSCLE_LABELS, COLOR_NONE, COLOR_ONCE } from '@/utils/muscles';

const ORANGE = '#fc7138';

/**
 * Prozorčić odozdo s generiranim treningom (utils/workoutGenerator.js).
 * Uz svaku vježbu su serije × ponavljanja, mišići (crveni/žuti označeni točkicom)
 * i zadnja kilaža iz povijesti.
 *
 * - `plan`      rezultat generateWorkout()
 * - `counts`    broj treninga ovaj tjedan po mišiću (za boju točkice)
 */
const WorkoutPlanSheet = ({ visible, onClose, onRegenerate, plan, counts }) => {
  if (!plan) return null;

  const allDone = plan.red.length === 0 && plan.yellow.length === 0;
  const dotColor = (muscle) =>
    counts[muscle] === 0 ? COLOR_NONE : counts[muscle] === 1 ? COLOR_ONCE : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* unutarnji Pressable guta dodir, da dodir na prozorčić ne zatvori prozorčić */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Trening za danas</Text>
              <Text style={styles.subtitle}>
                {allDone
                  ? 'Svi mišići su ovaj tjedan odrađeni 2× ili više'
                  : `Pokriva ${plan.red.length - plan.missedRed.length}/${plan.red.length} crvenih` +
                    (plan.yellow.length
                      ? ` i ${plan.yellow.length - plan.missedYellow.length}/${plan.yellow.length} žutih mišića`
                      : ' mišića')}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color="#65617e" />
            </Pressable>
          </View>

          {allDone ? (
            <Text style={styles.empty}>
              Cijelo tijelo je ovaj tjedan dobro istrenirano. Odmori se ili ponovi
              omiljeni trening. Novi tjedan kreće u ponedjeljak.
            </Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {plan.exercises.map((exercise, index) => (
                <View key={exercise.name} style={styles.row}>
                  <Text style={styles.number}>{index + 1}</Text>
                  <View style={styles.rowText}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{exercise.name}</Text>
                      <Text style={styles.prescription}>
                        {exercise.sets} × {exercise.reps}
                      </Text>
                    </View>
                    <View style={styles.muscles}>
                      {exercise.muscles.map((muscle) => (
                        <View key={muscle} style={styles.muscle}>
                          {dotColor(muscle) && (
                            <View style={[styles.dot, { backgroundColor: dotColor(muscle) }]} />
                          )}
                          <Text style={styles.muscleText}>{MUSCLE_LABELS[muscle]}</Text>
                        </View>
                      ))}
                    </View>
                    {exercise.lastWeight ? (
                      <Text style={styles.last}>
                        Zadnje: {exercise.lastWeight} kg
                        {exercise.lastReps ? ` × ${exercise.lastReps}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}

              {plan.missedRed.length > 0 && (
                <Text style={styles.note}>
                  Nije stalo (crveno): {plan.missedRed.map((m) => MUSCLE_LABELS[m]).join(', ')}
                </Text>
              )}
              {plan.missedYellow.length > 0 && (
                <Text style={styles.note}>
                  Nije stalo (žuto): {plan.missedYellow.map((m) => MUSCLE_LABELS[m]).join(', ')}
                </Text>
              )}
            </ScrollView>
          )}

          {!allDone && (
            <Pressable style={styles.regenerate} onPress={onRegenerate}>
              <Feather name="refresh-cw" size={16} color="#fff" />
              <Text style={styles.regenerateText}>Generiraj drugi</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  number: {
    width: 22,
    fontSize: 15,
    fontWeight: 'bold',
    color: ORANGE,
  },
  rowText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  prescription: {
    fontSize: 14,
    fontWeight: 'bold',
    color: ORANGE,
    marginLeft: 8,
  },
  muscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000',
  },
  muscleText: {
    fontSize: 12,
    color: '#65617e',
  },
  last: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },
  note: {
    fontSize: 12,
    color: '#c0392b',
    marginTop: 8,
  },
  empty: {
    paddingVertical: 20,
    color: '#888',
    fontSize: 14,
  },
  regenerate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  regenerateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WorkoutPlanSheet;
