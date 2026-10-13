import { useMemo, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MAX_SUGGESTIONS = 12;

// Pretraga bez kvačica, da "riza" pronađe i "Riža"
const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd');

/**
 * Polje za naziv s prijedlozima iz kataloga (vježbe ili namirnice).
 * - onChange(text)      kad korisnik tipka
 * - onSelect(item)      kad dodirne prijedlog (roditelj tada popuni ostala polja)
 * - groupKey            polje po kojem se prijedlozi grupiraju
 *
 * Prijedlozi su obični View-ovi (ne SectionList), jer se komponenta nalazi unutar
 * ScrollView-a u modalu, a ugniježđene liste izazivaju upozorenja.
 */
const ExerciseAutocompleteInput = ({
  value,
  onChange,
  onSelect,
  catalog = [],
  placeholder = 'Unesi ili pronađi vježbu',
  groupKey = 'muscle_group',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sections = useMemo(() => {
    const query = normalize(value.trim());
    if (!query) return [];

    const filtered = catalog
      .filter((exercise) => normalize(exercise.name).includes(query))
      .slice(0, MAX_SUGGESTIONS);

    const groups = [];
    filtered.forEach((exercise) => {
      const title = exercise[groupKey] || 'Ostalo';
      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { title, data: [] };
        groups.push(group);
      }
      group.data.push(exercise);
    });
    return groups;
  }, [value, catalog, groupKey]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
      />

      {showSuggestions && sections.length > 0 && (
        <View style={styles.suggestions}>
          {sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.groupHeader}>{section.title}</Text>
              {section.data.map((exercise) => (
                <TouchableOpacity
                  key={`${section.title}-${exercise.name}`}
                  onPress={() => {
                    onSelect(exercise);
                    setShowSuggestions(false);
                  }}
                  style={styles.suggestionItem}
                >
                  <Text>{exercise.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: 'orange',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333', // inače bijel tekst kad je mobitel u tamnom načinu
    marginRight: 12,
  },
  suggestions: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 5,
    marginRight: 12,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  groupHeader: {
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
    padding: 5,
    fontSize: 14,
  },
});

export default ExerciseAutocompleteInput;
