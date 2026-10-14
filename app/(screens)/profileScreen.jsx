import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import KettlebellSlider from '@/components/KettlebellSlider';
import NumberChips from '@/components/NumberChips';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import SaiyanSearchModal from '@/components/SaiyanSearchModal';
import { useTour, useTourTarget } from '@/contexts/TourContext';
import { avatarImage, DEFAULT_AVATAR } from '@/components/avatars';
import { USERNAME_HINT } from '@/services/usernameService';
import {
  AGE_RANGES,
  ACTIVITY_LEVELS,
  SEXES,
  GOALS,
  RATE_OPTIONS,
  HEIGHT_RANGE,
  WEIGHT_RANGE,
  DEFAULT_PROFILE,
  calcTargets,
} from '@/utils/nutrition';

const AGE_IDS = AGE_RANGES.map((r) => r.id);
const SEX_IDS = SEXES.map((s) => s.id);
const GOAL_IDS = GOALS.map((g) => g.id);
const sexLabel = (id) => SEXES.find((s) => s.id === id)?.label ?? id;
const goalLabel = (id) => GOALS.find((g) => g.id === id)?.label ?? id;

// Decimalni zarez, kako se piše kod nas
const comma = (n) => String(n).replace('.', ',');

const withDefaults = (profile) => ({ ...DEFAULT_PROFILE, ...(profile || {}) });

// Gumbi − i + za fino podešavanje
const Stepper = ({ onMinus, onPlus, style }) => (
  <View style={[styles.stepper, style]}>
    <TouchableOpacity style={styles.stepButton} onPress={onMinus}>
      <Text style={styles.stepText}>−</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.stepButton} onPress={onPlus}>
      <Text style={styles.stepText}>+</Text>
    </TouchableOpacity>
  </View>
);

const ResultRow = ({ label, value, strong }) => (
  <View style={styles.resultRow}>
    <Text style={[styles.resultLabel, strong && styles.resultStrong]}>{label}</Text>
    <Text style={[styles.resultValue, strong && styles.resultStrongValue]}>{value}</Text>
  </View>
);

const ProfileScreen = () => {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    updateProfile,
    updateAvatar,
    setUsername,
    updateSearchVisible,
  } = useAuth();
  const [searchVisible, setSearchVisible] = useState(false);
  const tour = useTour();
  const userTourRef = useTourTarget('profile-user');
  const slidersTourRef = useTourTarget('profile-sliders');
  const scrollRef = useRef(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const visibleInSearch = user?.prefs?.searchHidden !== true;

  const saved = user?.prefs?.profile;
  const [profile, setProfile] = useState(() => withDefaults(saved));
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatar = user?.prefs?.avatar || DEFAULT_AVATAR;
  // Username za račune napravljene prije uvođenja usernamea
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading]);

  // Drugi korisnik se prijavio: učitaj njegov profil
  useEffect(() => {
    setProfile(withDefaults(user?.prefs?.profile));
  }, [user?.$id]);

  // Vodič kreće (npr. linkom s dna profila): vrati profil na vrh,
  // da se kasnije vide elementi o kojima vodič govori
  useEffect(() => {
    if (tour?.active) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tour?.active]);

  const update = (key) => (value) => setProfile((p) => ({ ...p, [key]: value }));

  const clampStep = (key, { min, max }, delta) =>
    setProfile((p) => ({
      ...p,
      [key]: Number(Math.min(max, Math.max(min, p[key] + delta)).toFixed(2)),
    }));

  // Brzina mora postojati za odabrani cilj (npr. 3 kg postoji samo za mršavljenje)
  const changeGoal = (goal) =>
    setProfile((p) => ({
      ...p,
      goal,
      rateKg: (RATE_OPTIONS[goal] || []).includes(p.rateKg) ? p.rateKg : 1,
    }));

  const targets = useMemo(() => calcTargets(profile), [profile]);
  const dirty = !saved || JSON.stringify(profile) !== JSON.stringify(withDefaults(saved));

  const lockScroll = () => setScrollEnabled(false);
  const unlockScroll = () => setScrollEnabled(true);

  const handleSave = async () => {
    setSaving(true);
    const response = await updateProfile(profile);
    setSaving(false);

    if (response?.error) {
      Alert.alert('Greška', response.error);
    }
  };

  // Avatar se sprema odmah, neovisno o gumbu "Spremi profil"
  const handleSelectAvatar = async (id) => {
    if (id === avatar) {
      setPickerVisible(false);
      return;
    }
    setSavingAvatar(true);
    const response = await updateAvatar(id);
    setSavingAvatar(false);

    if (response?.error) {
      Alert.alert('Greška', response.error);
      return;
    }
    setPickerVisible(false);
  };

  // Vidljivost u pretrazi Saiyana sprema se odmah
  const handleVisibility = async (visible) => {
    setSavingVisibility(true);
    const response = await updateSearchVisible(visible);
    setSavingVisibility(false);
    if (response?.error) {
      Alert.alert('Greška', response.error);
    }
  };

  // Username se postavlja jednom i nakon toga se ne može mijenjati
  const handleSaveUsername = async () => {
    setSavingUsername(true);
    const response = await setUsername(newUsername);
    setSavingUsername(false);

    if (response?.error) {
      Alert.alert('Saiyan name', response.error);
      return;
    }
    setNewUsername('');
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
    >
      <View ref={userTourRef} collapsable={false} style={styles.userRow}>
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={styles.avatarButton}
          accessibilityLabel="Odaberi avatara"
        >
          <Image source={avatarImage(avatar)} style={styles.avatar} />
          <View style={styles.avatarBadge}>
            <Feather name="edit-2" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.smallLabel}>Saiyan name</Text>
          {user?.name ? (
            <View style={styles.usernameRow}>
              <TextInput
                style={[styles.readOnly, styles.flexInput]}
                value={user.name}
                editable={false}
              />
              {/* Pretraga drugih Saiyana */}
              <TouchableOpacity
                style={styles.usernameButton}
                onPress={() => setSearchVisible(true)}
                accessibilityLabel="Pronađi Saiyana"
              >
                <Feather name="search" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.usernameRow}>
                <TextInput
                  style={[styles.usernameInput, styles.flexInput]}
                  placeholder="Odaberi username"
                  placeholderTextColor="#aaa"
                  value={newUsername}
                  onChangeText={(text) => setNewUsername(text.toLowerCase())}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                <TouchableOpacity
                  style={styles.usernameButton}
                  onPress={handleSaveUsername}
                  disabled={savingUsername || !newUsername.trim()}
                >
                  {savingUsername ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Feather name="check" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.usernameHint}>
                {USERNAME_HINT}. Za prijavu umjesto e-maila ({user?.email}).
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.visibilityRow}>
        <View style={styles.flexInput}>
          <Text style={styles.visibilityTitle}>Vidljiv u pretrazi</Text>
          <Text style={styles.visibilityHint}>
            Drugi Saiyani mogu pronaći tvoje ime, avatara i statistiku treninga
          </Text>
        </View>
        <Switch
          value={visibleInSearch}
          onValueChange={handleVisibility}
          disabled={savingVisibility}
          trackColor={{ true: '#f5b08f', false: '#ddd' }}
          thumbColor={visibleInSearch ? ORANGE : '#f4f4f4'}
        />
      </View>

      <Text style={styles.section}>Spol</Text>
      <NumberChips
        options={SEX_IDS}
        value={profile.sex}
        onChange={update('sex')}
        labelFor={sexLabel}
      />

      <Text style={styles.section}>Veličina</Text>
      <View ref={slidersTourRef} collapsable={false} style={styles.heightRow}>
        <KettlebellSlider
          vertical
          length={320}
          value={profile.heightCm}
          min={HEIGHT_RANGE.min}
          max={HEIGHT_RANGE.max}
          step={HEIGHT_RANGE.step}
          minorEvery={5}
          majorEvery={10}
          labelEvery={10}
          onChange={update('heightCm')}
          onDragStart={lockScroll}
          onDragEnd={unlockScroll}
        />
        <View style={styles.heightInfo}>
          <Text style={styles.bigValue}>
            {profile.heightCm}
            <Text style={styles.unit}> cm</Text>
          </Text>
          <Stepper
            onMinus={() => clampStep('heightCm', HEIGHT_RANGE, -HEIGHT_RANGE.step)}
            onPlus={() => clampStep('heightCm', HEIGHT_RANGE, HEIGHT_RANGE.step)}
          />
          <Text style={styles.hint}>Povuci kettlebell gore ili dolje</Text>
        </View>
      </View>

      <View style={styles.weightHeader}>
        <Text style={styles.sectionInline}>Težina</Text>
        <Text style={styles.value}>{comma(profile.weightKg)} kg</Text>
        <Stepper
          style={styles.stepperInline}
          onMinus={() => clampStep('weightKg', WEIGHT_RANGE, -WEIGHT_RANGE.step)}
          onPlus={() => clampStep('weightKg', WEIGHT_RANGE, WEIGHT_RANGE.step)}
        />
      </View>
      <KettlebellSlider
        value={profile.weightKg}
        min={WEIGHT_RANGE.min}
        max={WEIGHT_RANGE.max}
        step={WEIGHT_RANGE.step}
        minorEvery={5}
        majorEvery={10}
        labelEvery={20}
        formatValue={comma}
        onChange={update('weightKg')}
        onDragStart={lockScroll}
        onDragEnd={unlockScroll}
      />

      <Text style={styles.section}>Godine</Text>
      <NumberChips options={AGE_IDS} value={profile.ageRange} onChange={update('ageRange')} />

      <Text style={styles.section}>Razina aktivnosti</Text>
      {ACTIVITY_LEVELS.map((level) => {
        const active = profile.activity === level.id;
        return (
          <TouchableOpacity
            key={level.id}
            style={[styles.levelCard, active && styles.levelCardActive]}
            onPress={() => update('activity')(level.id)}
          >
            <Text style={[styles.levelTitle, active && styles.levelTitleActive]}>
              {level.title}
              <Text style={styles.levelLabel}>  ·  {level.label}</Text>
            </Text>
            <Text style={styles.levelDescription}>{level.description}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.section}>Cilj</Text>
      <NumberChips
        options={GOAL_IDS}
        value={profile.goal}
        onChange={changeGoal}
        labelFor={goalLabel}
      />
      {profile.goal !== 'maintain' && (
        <>
          <Text style={styles.subSection}>
            {profile.goal === 'lose' ? 'Koliko kg mjesečno skinuti?' : 'Koliko kg mjesečno gainati?'}
          </Text>
          <NumberChips
            options={RATE_OPTIONS[profile.goal]}
            value={profile.rateKg}
            onChange={update('rateKg')}
            labelFor={(n) => `${comma(n)} kg`}
          />
        </>
      )}

      {targets && (
        <View style={styles.resultCard}>
          <ResultRow label="Bazalni metabolizam" value={`${targets.bmr} kcal`} />
          <ResultRow label="Održavanje kilaže" value={`${targets.tdee} kcal`} />
          <ResultRow label="Dnevni cilj" value={`${targets.calories} kcal`} strong />
          {targets.change !== 0 && (
            <Text style={styles.note}>
              {targets.change > 0 ? '+' : '−'}
              {Math.abs(targets.change)} kcal dnevno u odnosu na održavanje
            </Text>
          )}
          <ResultRow label="Proteini dnevno" value={`${targets.protein} g`} strong />
          <Text style={styles.note}>
            {comma(targets.proteinPerKg.toFixed(1))} g po kg tjelesne mase
          </Text>
          {targets.warnings.map((warning) => (
            <Text key={warning} style={styles.warning}>
              ⚠ {warning}
            </Text>
          ))}
          <Text style={styles.footnote}>
            {targets.formula} × faktor aktivnosti, 1 kg ≈ 7700 kcal. Procjena je okvirna (±10%):
            prati kilažu 2-3 tjedna i po potrebi prilagodi cilj.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, !dirty && styles.saveButtonDone]}
        onPress={handleSave}
        disabled={saving || !dirty}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>{dirty ? 'Spremi profil' : 'Spremljeno ✓'}</Text>
        )}
      </TouchableOpacity>

      {/* Ponovno pokretanje vodiča kroz aplikaciju */}
      <TouchableOpacity style={styles.tourLink} onPress={tour?.start}>
        <Feather name="help-circle" size={16} color={ORANGE} />
        <Text style={styles.tourLinkText}>Vodič kroz aplikaciju</Text>
      </TouchableOpacity>

      <SaiyanSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        currentUserId={user?.$id}
      />

      <AvatarPickerModal
        visible={pickerVisible}
        selected={avatar}
        saving={savingAvatar}
        onSelect={handleSelectAvatar}
        onClose={() => setPickerVisible(false)}
      />
    </ScrollView>
  );
};

const ORANGE = '#fc7138';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarButton: {
    marginRight: 14,
  },
  avatar: {
    width: 76,
    height: 76,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  smallLabel: {
    fontSize: 12,
    color: '#65617e',
    marginBottom: 4,
  },
  readOnly: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    opacity: 0.5,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInput: {
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  flexInput: {
    flex: 1,
  },
  usernameButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 8,
  },
  tourLinkText: {
    color: ORANGE,
    fontSize: 15,
    fontWeight: '600',
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff3ec',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  visibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  visibilityHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  usernameHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  section: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
  },
  subSection: {
    fontSize: 14,
    color: '#65617e',
    marginTop: 12,
    marginBottom: 6,
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heightInfo: {
    flex: 1,
    alignItems: 'center',
  },
  bigValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: ORANGE,
  },
  unit: {
    fontSize: 18,
    color: '#65617e',
    fontWeight: 'normal',
  },
  sectionInline: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: ORANGE,
    marginRight: 10,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  stepperInline: {
    marginTop: 0,
  },
  stepper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 20,
    color: ORANGE,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  levelCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  levelCardActive: {
    borderColor: ORANGE,
    backgroundColor: '#fff3ec',
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  levelTitleActive: {
    color: ORANGE,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: 'normal',
    color: '#65617e',
  },
  levelDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  resultCard: {
    backgroundColor: '#fff3ec',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
  },
  resultLabel: {
    fontSize: 14,
    color: '#65617e',
  },
  resultValue: {
    fontSize: 15,
    color: '#333',
  },
  resultStrong: {
    color: '#333',
    fontWeight: 'bold',
  },
  resultStrongValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ORANGE,
  },
  note: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  warning: {
    fontSize: 12,
    color: '#c0392b',
    marginTop: 8,
  },
  footnote: {
    fontSize: 11,
    color: '#999',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: ORANGE,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDone: {
    backgroundColor: '#f5b08f',
  },
  saveText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
