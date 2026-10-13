import { Text, StyleSheet } from 'react-native';

// Što se trenutno prikazuje: "Danas, 13.10.", "Tjedan 13.10. – 19.10." ili "Svi dani"
export const RangeLabel = ({ label }) => <Text style={styles.range}>{label}</Text>;

// Naslov dana u tablici kad se prikazuje više dana
const DayHeader = ({ label }) => <Text style={styles.day}>{label}</Text>;

const styles = StyleSheet.create({
  range: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#65617e',
    textAlign: 'center',
    marginBottom: 8,
  },
  day: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fc7138',
    backgroundColor: '#fff3ec',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    marginBottom: 2,
  },
});

export default DayHeader;
