import { StyleSheet } from 'react-native';

// Zajednički izgled "oblačića" (mišićne skupine, serije, ponavljanja)
export const chipStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'orange',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  numberChip: {
    minWidth: 38,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#fc7138',
    borderColor: '#fc7138',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
