import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultData from './workout_exercises.json';

export default function ExerciseSelector({ onSelect }) {
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const stored = await AsyncStorage.getItem('@custom_exercises');
      const custom = stored ? JSON.parse(stored) : [];
      const allData = [...defaultData, ...custom];

      const grouped = allData.reduce((acc, item) => {
        const group = item.muscle_group || 'Ostalo';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
      }, {});

      const sectionData = Object.entries(grouped).map(([group, data]) => ({
        title: group,
        data,
      }));

      setSections(sectionData);
      setFilteredSections(sectionData);
    } catch (e) {
      console.error('Greška pri učitavanju vježbi', e);
    }
  };

  const saveCustomExercise = async (exerciseName) => {
    const newExercise = {
      name: exerciseName,
      muscle_group: 'Korisničke',
      description: 'Vježba koju je dodao korisnik',
    };

    try {
      const stored = await AsyncStorage.getItem('@custom_exercises');
      const custom = stored ? JSON.parse(stored) : [];
      const updated = [...custom, newExercise];
      await AsyncStorage.setItem('@custom_exercises', JSON.stringify(updated));
      loadExercises();
      onSelect(exerciseName);
      Alert.alert('Dodano', 'Nova vježba je spremljena trajno.');
    } catch (e) {
      console.error('Greška pri spremanju nove vježbe', e);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setFilteredSections(sections);
      return;
    }

    const filtered = sections
      .map((section) => ({
        title: section.title,
        data: section.data.filter((item) =>
          item.name.toLowerCase().includes(query.toLowerCase())
        ),
      }))
      .filter((section) => section.data.length > 0);

    setFilteredSections(filtered);
  }, [query]);

  const handleSelect = (exerciseName, isCustom = false) => {
    setQuery('');
    Keyboard.dismiss();
    if (isCustom) {
      saveCustomExercise(exerciseName);
    } else {
      onSelect(exerciseName);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Upiši ili odaberi vježbu..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      <SectionList
        sections={filteredSections}
        keyExtractor={(item, index) => item.name + index}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item.name)}
            style={styles.item}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.header}>{title}</Text>
        )}
        keyboardShouldPersistTaps="handled"
      />

      {query &&
        !filteredSections.some((s) =>
          s.data.some((i) => i.name.toLowerCase() === query.toLowerCase())
        ) && (
          <TouchableOpacity
            onPress={() => handleSelect(query, true)}
            style={styles.addNew}
          >
            <Text>
              ➕ Dodaj novu vježbu:{' '}
              <Text style={{ fontWeight: 'bold' }}>{query}</Text>
            </Text>
          </TouchableOpacity>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  header: {
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: '#eee',
    padding: 5,
    marginTop: 10,
  },
  item: {
    padding: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  addNew: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#d0f0d0',
    borderRadius: 8,
  },
});
