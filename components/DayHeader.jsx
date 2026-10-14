import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Što se trenutno prikazuje: "Danas, 13.10.", "Tjedan 13.10. – 19.10." ili "Svi dani".
// Uz `onShare` desno se pojavi gumb za dijeljenje dana.
export const RangeLabel = ({ label, onShare }) => (
  <View style={styles.rangeRow}>
    <View style={styles.side} />
    <Text style={styles.range}>{label}</Text>
    <View style={[styles.side, styles.sideRight]}>
      {onShare ? (
        <Pressable onPress={onShare} hitSlop={10} accessibilityLabel="Podijeli dan">
          <Feather name="share-2" size={20} color="#fc7138" />
        </Pressable>
      ) : null}
    </View>
  </View>
);

// Naslov dana u tablici kad se prikazuje više dana; `extra` je sažetak dana (npr. volumen)
const DayHeader = ({ label, extra }) => (
  <View style={styles.day}>
    <Text style={styles.dayText}>{label}</Text>
    {extra ? <Text style={styles.extra}>{extra}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // jednako široki rubovi, da naslov ostane u sredini
  side: {
    width: 48,
    alignItems: 'flex-end',
  },
  // gumb za dijeljenje malo odmaknut od desnog ruba
  sideRight: {
    paddingRight: 14,
  },
  range: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#65617e',
    textAlign: 'center',
  },
  day: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3ec',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  dayText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fc7138',
  },
  extra: {
    fontSize: 12,
    fontWeight: '600',
    color: '#65617e',
  },
});

export default DayHeader;
