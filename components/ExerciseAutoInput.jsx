import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  SectionList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import defaultExercises from './workout_exercises.json'; // ili tvoj import put
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'CUSTOM_EXERCISE_LIST';

const ExerciseAutocompleteInput = ({ value, onChange }) => {
  const [exerciseList, setExerciseList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setExerciseList(JSON.parse(stored));
        } else {
          setExerciseList(defaultExercises);
        }
      } catch (err) {
        console.log('Greška kod učitavanja vježbi:', err);
        setExerciseList(defaultExercises);
      }
    };

    loadExercises();
  }, []);

  const addNewExercise = async (newExercise) => {
    const updatedList = [...exerciseList, newExercise];
    setExerciseList(updatedList);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.log('Greška kod spremanja vježbi:', err);
    }
  };

  const filtered = exerciseList.filter((exercise) =>
    exercise.name.toLowerCase().includes(value.toLowerCase())
  );

  const groupedExercises = filtered.reduce((groups, exercise) => {
    const muscleGroup = exercise.muscle_group || 'Others'; // Dodajemo fallback ako nema mišićne skupine
    if (!groups[muscleGroup]) groups[muscleGroup] = [];
    groups[muscleGroup].push(exercise);
    return groups;
  }, {});

  const sections = Object.keys(groupedExercises).map((muscleGroup) => ({
    title: muscleGroup,
    data: groupedExercises[muscleGroup],
  }));

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Unesi ili pronađi vježbu"
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
      />

      {showSuggestions && value.length > 0 && (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                onChange(item.name);
                setShowSuggestions(false);
              }}
              style={styles.suggestionItem}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.groupHeader}>{title}</Text>
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {filtered.length === 0 && value.length > 0 && (
        <TouchableOpacity
          onPress={async () => {
            const newExercise = {
              name: value,
              muscle_group: 'Custom',
              description: '',
            };
            await addNewExercise(newExercise);
            onChange(value); // Dodajemo unos nove vježbe
            setShowSuggestions(false);
          }}
          style={styles.addNewExercise}
        >
          <Text style={{ color: '#5647b5' }}>
            ➕ Dodaj novu vježbu: "{value}"
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  suggestions: {
    maxHeight: 180,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 5,
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
  addNewExercise: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffe3af', // blago plava pozadina
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cce0ff', // svjetlija plava granica
  },
});

export default ExerciseAutocompleteInput;
