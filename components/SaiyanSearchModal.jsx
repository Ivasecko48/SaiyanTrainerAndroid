import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import usernameService from '@/services/usernameService';
import { avatarImage } from '@/components/avatars';
import { ACTIVITY_LEVELS } from '@/utils/nutrition';
import { MUSCLE_LABELS, normalizeMuscles } from '@/utils/muscles';
import { formatVolume } from '@/utils/volume';

const ORANGE = '#fc7138';
const SEARCH_DELAY = 400;

const activityTitle = (id) => ACTIVITY_LEVELS.find((level) => level.id === id)?.title;

const StatBox = ({ value, label }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Kartica jednog Saiyana: avatar, ime, razina aktivnosti i statistika ovog tjedna
const SaiyanCard = ({ userId, onBack }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    usernameService.stats(userId).then((response) => {
      if (!active) return;
      if (response.error) setError(response.error);
      else setData(response);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const muscles = normalizeMuscles(data?.week?.muscles);

  return (
    <View>
      <TouchableOpacity style={styles.back} onPress={onBack}>
        <Feather name="chevron-left" size={18} color={ORANGE} />
        <Text style={styles.backText}>Natrag</Text>
      </TouchableOpacity>

      {error ? (
        <Text style={styles.message}>{error}</Text>
      ) : !data ? (
        <ActivityIndicator color={ORANGE} style={styles.loader} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.cardHeader}>
            <Image source={avatarImage(data.user.avatar)} style={styles.cardAvatar} />
            <Text style={styles.cardName}>{data.user.username}</Text>
            {activityTitle(data.user.activity) ? (
              <Text style={styles.cardLevel}>{activityTitle(data.user.activity)}</Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Ovaj tjedan</Text>
          <View style={styles.stats}>
            <StatBox value={data.week.workouts} label="treninga" />
            <StatBox value={data.week.exercises} label="vježbi" />
            <StatBox value={formatVolume(data.week.volume)} label="volumen" />
          </View>

          <Text style={styles.sectionTitle}>Trenirani mišići</Text>
          {muscles.length ? (
            <View style={styles.chips}>
              {muscles.map((key) => (
                <Text key={key} style={styles.chip}>
                  {MUSCLE_LABELS[key]}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>Ovaj tjedan još nema treninga.</Text>
          )}

          <Text style={styles.total}>Ukupno treninga: {data.totalWorkouts}</Text>
        </ScrollView>
      )}
    </View>
  );
};

// Pretraga drugih Saiyana po imenu; klik na rezultat otvara njegovu karticu
const SaiyanSearchModal = ({ visible, onClose, currentUserId }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Pretraga kreće kad se prestane tipkati (bar 2 znaka)
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let active = true;
    const timer = setTimeout(async () => {
      const response = await usernameService.search(text);
      if (!active) return;
      setLoading(false);
      if (response.error) {
        setError(response.error);
        setResults([]);
      } else {
        setError(null);
        setResults(response.users.filter((u) => u.id !== currentUserId));
      }
    }, SEARCH_DELAY);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, currentUserId]);

  const close = () => {
    setSelectedId(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      {/* Dodir izvan prozora ga zatvara; dodir unutar njega ne */}
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.content} onPress={() => {}}>
          {selectedId ? (
            <SaiyanCard userId={selectedId} onBack={() => setSelectedId(null)} />
          ) : (
            <>
              <Text style={styles.title}>Pronađi Saiyana</Text>
              <View style={styles.searchRow}>
                <Feather name="search" size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Upiši ime (barem 2 slova)"
                  placeholderTextColor="#aaa"
                  value={query}
                  onChangeText={(text) => setQuery(text.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {loading ? (
                <ActivityIndicator color={ORANGE} style={styles.loader} />
              ) : error ? (
                <Text style={styles.message}>{error}</Text>
              ) : query.trim().length >= 2 && results.length === 0 ? (
                <Text style={styles.message}>Nema Saiyana s tim imenom.</Text>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>
                  {results.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.resultRow}
                      onPress={() => setSelectedId(user.id)}
                    >
                      <Image source={avatarImage(user.avatar)} style={styles.resultAvatar} />
                      <View style={styles.resultText}>
                        <Text style={styles.resultName}>{user.username}</Text>
                        {activityTitle(user.activity) ? (
                          <Text style={styles.resultLevel}>{activityTitle(user.activity)}</Text>
                        ) : null}
                      </View>
                      <Feather name="chevron-right" size={18} color="#ccc" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
    minHeight: 220,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ORANGE,
    textAlign: 'center',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  loader: {
    marginTop: 24,
  },
  message: {
    textAlign: 'center',
    color: '#888',
    marginTop: 24,
  },
  results: {
    marginTop: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1e7e0',
  },
  resultAvatar: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  resultLevel: {
    fontSize: 12,
    color: '#888',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    color: ORANGE,
    fontSize: 15,
    fontWeight: '600',
  },
  cardHeader: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 96,
    height: 96,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 6,
  },
  cardLevel: {
    fontSize: 14,
    color: ORANGE,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff3ec',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: ORANGE,
  },
  statLabel: {
    fontSize: 11,
    color: '#65617e',
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 9,
    fontSize: 12,
    color: '#333',
  },
  muted: {
    color: '#888',
    fontSize: 13,
  },
  total: {
    marginTop: 14,
    textAlign: 'center',
    color: '#65617e',
    fontWeight: '600',
  },
});

export default SaiyanSearchModal;
