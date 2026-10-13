import { StyleSheet } from 'react-native';

// Širine stupaca (flex) dijele zaglavlje i redovi, da stupci uvijek ostanu poravnati
export const EXERCISE_COLUMNS = [
  { label: 'Exercise', flex: 3.2 },
  { label: 'Kg', flex: 1 },
  { label: 'Sets', flex: 1 },
  { label: 'Reps', flex: 1 },
  { label: 'RPE', flex: 1 },
];

// Kalorije pa makronutrijenti zajedno; proteini, masti i UH su u gramima
export const MEAL_COLUMNS = [
  { label: 'Meal', flex: 2.2 },
  { label: 'Kcal', flex: 1.1 },
  { label: 'Prot', flex: 1 },
  { label: 'Masti', flex: 1.1 },
  { label: 'UH', flex: 1 },
];

// prostor za ikone olovke i smeća na kraju reda
export const ACTIONS_WIDTH = 62;

export const tableStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff3ec',
    borderRadius: 10,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fc7138',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  headerFirst: {
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1e7e0',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  subText: {
    fontSize: 11,
    color: '#8a8590',
    marginTop: 2,
  },
  cell: {
    textAlign: 'center',
    fontSize: 15,
    color: '#333',
  },
  // manji brojevi za tablicu obroka, koja ima više stupaca
  cellSmall: {
    fontSize: 14,
  },
  actions: {
    width: ACTIONS_WIDTH,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
});
