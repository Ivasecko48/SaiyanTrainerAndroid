import { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { avatarImage } from '@/components/avatars';
import { formatDayLong, fromKey } from '@/utils/dates';
import { MUSCLE_LABELS, normalizeMuscles, musclesToText } from '@/utils/muscles';
import { formatReps } from '@/utils/reps';
import { exerciseVolume, totalVolume, formatVolume } from '@/utils/volume';
import { calorieStatus, proteinStatus } from '@/utils/nutrition';

const ORANGE = '#fc7138';
const DARK = '#1d1b2e';
const CARD_WIDTH = 340;

const comma = (n) => String(n).replace('.', ',');
const sum = (list, key) => list.reduce((total, item) => total + (Number(item[key]) || 0), 0);

// 'Utorak, 14.10.2026.'
const fullDate = (key) => `${formatDayLong(key)}${fromKey(key).getFullYear()}.`;

const Stat = ({ value, label }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Kartica jednog dana treninga
const TrainingCard = ({ exercises }) => {
  const muscles = [...new Set(exercises.flatMap((ex) => normalizeMuscles(ex.muscles)))];
  return (
    <>
      {exercises.map((ex, index) => {
        const weight = Number(ex.weight) || 0;
        const volume = exerciseVolume(ex);
        return (
          <View key={ex.$id || index} style={styles.row}>
            <Text style={styles.rowNumber}>{index + 1}</Text>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {ex.name}
                </Text>
                <Text style={styles.rowValue}>
                  {ex.sets} × {formatReps(ex.reps)}
                  {weight > 0 ? ` · ${comma(weight)} kg` : ''}
                </Text>
              </View>
              <Text style={styles.rowSub} numberOfLines={1}>
                {musclesToText(ex.muscles)}
                {volume > 0 ? ` · Vol. ${formatVolume(volume)}` : ''}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={styles.stats}>
        <Stat value={exercises.length} label="vježbi" />
        <Stat value={sum(exercises, 'sets')} label="serija" />
        <Stat value={formatVolume(totalVolume(exercises))} label="volumen" />
      </View>

      {muscles.length > 0 && (
        <View style={styles.chips}>
          {muscles.map((key) => (
            <Text key={key} style={styles.chip}>
              {MUSCLE_LABELS[key]}
            </Text>
          ))}
        </View>
      )}
    </>
  );
};

// Kartica jednog dana prehrane
const MealsCard = ({ meals, targets }) => {
  const calories = sum(meals, 'calories');
  const protein = sum(meals, 'protein');
  const hasFat = meals.some((m) => m.fat !== null && m.fat !== undefined);
  const hasCarbs = meals.some((m) => m.carbs !== null && m.carbs !== undefined);
  const kcal = targets ? calorieStatus(calories, targets) : null;
  const prot = targets ? proteinStatus(protein, targets) : null;

  return (
    <>
      {meals.map((meal, index) => (
        <View key={meal.$id || index} style={styles.row}>
          <Text style={styles.rowNumber}>{index + 1}</Text>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.rowName} numberOfLines={1}>
                {meal.mealName || 'Obrok'}
              </Text>
              <Text style={styles.rowValue}>{meal.calories} kcal</Text>
            </View>
            <Text style={styles.rowSub}>
              P {meal.protein ?? 0} g
              {meal.fat !== null && meal.fat !== undefined ? ` · M ${meal.fat} g` : ''}
              {meal.carbs !== null && meal.carbs !== undefined ? ` · UH ${meal.carbs} g` : ''}
            </Text>
          </View>
        </View>
      ))}

      <View style={styles.stats}>
        <Stat value={calories} label="kcal" />
        <Stat value={`${protein} g`} label="proteini" />
        {hasFat && <Stat value={`${sum(meals, 'fat')} g`} label="masti" />}
        {hasCarbs && <Stat value={`${sum(meals, 'carbs')} g`} label="UH" />}
      </View>

      {targets && (
        <View style={styles.goal}>
          <Text style={styles.goalText}>
            Cilj: {targets.calories} kcal · {targets.protein} g proteina
          </Text>
          <Text style={styles.goalText}>
            <Text style={kcal.ok ? styles.ok : styles.bad}>{kcal.text}</Text>
            {'  ·  '}
            <Text style={prot.ok ? styles.ok : styles.bad}>{prot.text}</Text>
          </Text>
        </View>
      )}
    </>
  );
};

/**
 * Pregled kartice jednog dana (trening ili prehrana) i dijeljenje kao slike
 * u druge aplikacije (WhatsApp, Instagram...).
 *
 * - type       'training' | 'meals'
 * - items      vježbe ili obroci tog dana
 * - dayKey     'YYYY-MM-DD'
 * - targets    dnevni cilj iz profila (samo za prehranu, može biti null)
 */
const ShareDayModal = ({ visible, onClose, type, items, dayKey, targets, username, avatar }) => {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const training = type === 'training';

  const share = async () => {
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Dijeljenje', 'Dijeljenje nije dostupno na ovom uređaju.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: training ? 'Podijeli trening' : 'Podijeli prehranu',
      });
    } catch (error) {
      Alert.alert('Dijeljenje', error.message || 'Slika se nije mogla napraviti.');
    } finally {
      setSharing(false);
    }
  };

  if (!dayKey) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Ovaj View se snima kao slika */}
          <View ref={cardRef} collapsable={false} style={styles.card}>
            <View style={styles.header}>
              <Image source={avatarImage(avatar)} style={styles.avatar} />
              <View style={styles.headerText}>
                <Text style={styles.brand}>SAIYAN TRAINER</Text>
                <Text style={styles.headerTitle}>{training ? 'Trening' : 'Prehrana'}</Text>
                <Text style={styles.headerDate}>{fullDate(dayKey)}</Text>
              </View>
            </View>

            <View style={styles.body}>
              {training ? (
                <TrainingCard exercises={items} />
              ) : (
                <MealsCard meals={items} targets={targets} />
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerUser}>{username ? `@${username}` : 'Saiyan'}</Text>
              <Text style={styles.footerText}>Power level raste 🔥</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.cancel]} onPress={onClose} disabled={sharing}>
            <Text style={styles.cancelText}>Zatvori</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.shareButton]} onPress={share} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="share-2" size={18} color="#fff" />
                <Text style={styles.shareText}>Podijeli</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  scroll: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK,
    padding: 14,
  },
  avatar: {
    width: 62,
    height: 62,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  brand: {
    fontSize: 11,
    fontWeight: 'bold',
    color: ORANGE,
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  headerDate: {
    fontSize: 13,
    color: '#c9c6dd',
    marginTop: 2,
  },
  body: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1e7e0',
  },
  rowNumber: {
    width: 20,
    fontSize: 14,
    fontWeight: 'bold',
    color: ORANGE,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginRight: 8,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  rowSub: {
    fontSize: 11,
    color: '#8a8590',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: '#fff3ec',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: ORANGE,
  },
  statLabel: {
    fontSize: 10,
    color: '#65617e',
    marginTop: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 11,
    color: '#333',
  },
  goal: {
    marginTop: 10,
    alignItems: 'center',
  },
  goalText: {
    fontSize: 12,
    color: '#65617e',
    marginTop: 2,
    textAlign: 'center',
  },
  ok: {
    color: '#2e9e4f',
    fontWeight: 'bold',
  },
  bad: {
    color: '#d63031',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DARK,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footerUser: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  footerText: {
    fontSize: 12,
    color: ORANGE,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 13,
  },
  cancel: {
    backgroundColor: '#e5e5e5',
  },
  cancelText: {
    fontSize: 16,
    color: '#333',
  },
  shareButton: {
    backgroundColor: ORANGE,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShareDayModal;
