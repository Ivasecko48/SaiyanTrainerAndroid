import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MUSCLE_LABELS, musclesToText } from '@/utils/muscles';

/**
 * Prozorčić koji se podiže odozdo i izlista sve vježbe za odabranu mišićnu skupinu.
 * Dodir izvan prozorčića, gumb X ili tipka "natrag" zatvaraju ga.
 *
 * - `exercises` lista iz exercisesForMuscle(): { name, muscles, primary, doneThisWeek }
 * - `color`     boja skupine (crveno / žuto / zeleno), `count` broj treninga ovaj tjedan
 */
const MuscleExercisesSheet = ({
  visible,
  onClose,
  muscleKey,
  color,
  count = 0,
  exercises = [],
}) => (
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
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{MUSCLE_LABELS[muscleKey] || ''}</Text>
            <Text style={styles.subtitle}>
              Ovaj tjedan: {count}× · {exercises.length}{' '}
              {exercises.length === 1 ? 'vježba' : 'vježbi'}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color="#65617e" />
          </Pressable>
        </View>

        {exercises.length === 0 ? (
          <Text style={styles.empty}>
            Za ovu skupinu još nema vježbi. Vlastitu vježbu možeš dodati u tabu s
            vježbama.
          </Text>
        ) : (
          <FlatList
            style={styles.list}
            data={exercises}
            keyExtractor={(item) => item.name}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.muscles} numberOfLines={1}>
                    {musclesToText(item.muscles)}
                  </Text>
                </View>
                {item.doneThisWeek && (
                  <View style={styles.badge}>
                    <Feather name="check" size={12} color="#1e8449" />
                    <Text style={styles.badgeText}>ovaj tjedan</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </Pressable>
    </Pressable>
  </Modal>
);

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
    maxHeight: '65%',
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
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 10,
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
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 16,
    color: '#222',
  },
  muscles: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f8ee',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#1e8449',
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 20,
    color: '#888',
    fontSize: 14,
  },
});

export default MuscleExercisesSheet;
