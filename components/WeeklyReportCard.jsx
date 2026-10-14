import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const ORANGE = '#fc7138';
const GREEN = '#2e9e4f';

// Ikona stavke: ✓ u redu, ! treba popraviti, i informacija
const ItemIcon = ({ ok }) => {
  if (ok === true) return <Feather name="check-circle" size={16} color={GREEN} />;
  if (ok === false) return <Feather name="alert-circle" size={16} color={ORANGE} />;
  return <Feather name="info" size={16} color="#888" />;
};

/**
 * Kartica s tjednim izvještajem (utils/weeklyReport.js) na vrhu "Strong Boy".
 * X je zatvara do idućeg tjedna.
 */
const WeeklyReportCard = ({ report, onDismiss }) => (
  <View style={[styles.card, report.allGood && styles.cardGood]}>
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.week}>Prošli tjedan · {report.rangeLabel}</Text>
        <Text style={styles.title}>{report.title}</Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={12} accessibilityLabel="Zatvori izvještaj">
        <Feather name="x" size={20} color="#65617e" />
      </Pressable>
    </View>

    {report.items.map((item) => (
      <View key={item.id} style={styles.item}>
        <ItemIcon ok={item.ok} />
        <View style={styles.itemText}>
          <Text style={styles.text}>
            <Text style={styles.itemTitle}>{item.title}: </Text>
            {item.text}
          </Text>
          {(item.details || []).map((detail) => (
            <Text key={detail} style={styles.detail}>
              • {detail}
            </Text>
          ))}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff3ec',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f5c4a8',
    padding: 12,
    marginBottom: 10,
  },
  cardGood: {
    backgroundColor: '#eefaf2',
    borderColor: '#b7e4c7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
    paddingRight: 8,
  },
  week: {
    fontSize: 11,
    color: '#888',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 2,
  },
  item: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  text: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  detail: {
    fontSize: 12,
    color: '#65617e',
    marginTop: 2,
  },
});

export default WeeklyReportCard;
