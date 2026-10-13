import { View, Text, StyleSheet } from 'react-native';

// Što se trenutno prikazuje: "Danas, 13.10.", "Tjedan 13.10. – 19.10." ili "Svi dani"
export const RangeLabel = ({ label }) => <Text style={styles.range}>{label}</Text>;

// Naslov dana u tablici kad se prikazuje više dana; `extra` je sažetak dana (npr. volumen)
const DayHeader = ({ label, extra }) => (
  <View style={styles.day}>
    <Text style={styles.dayText}>{label}</Text>
    {extra ? <Text style={styles.extra}>{extra}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  range: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#65617e',
    textAlign: 'center',
    marginBottom: 8,
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
