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
import { Picker } from '@react-native-picker/picker';

const STORAGE_KEY = 'CUSTOM_EXERCISE_LIST';

const ExerciseAutocompleteInput = ({ value, onChange }) => {
  const [exerciseList, setExerciseList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const muscleGroups = Array.from(
    new Set(exerciseList.map((ex) => ex.muscle_group || 'Ostalo'))
  );

  useEffect(() => {
    const loadExercises = async () => {
      try {
        // 1. Učitaj vježbe iz .json datoteke
        let combined = [...defaultExercises];

        // 2. Učitaj dodatne korisničke vježbe iz AsyncStorage
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);

          // 3. Kombiniraj ako nisu već duplikati
          parsed.forEach((ex) => {
            const exists = combined.some((e) => e.name === ex.name);
            if (!exists) combined.push(ex);
          });
        }

        // 4. Postavi state
        setExerciseList(combined);

        console.log('✅ Učitane vježbe:', combined.length);
      } catch (err) {
        console.log('❌ Greška kod učitavanja vježbi:', err);
        setExerciseList(defaultExercises); // fallback
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
        placeholderTextColor="#888"
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

      {filtered.length === 0 && value.length > 0 && !addingNew && (
        <TouchableOpacity
          onPress={() => {
            setAddingNew(true);
          }}
          style={styles.addNewExercise}
        >
          <Text style={{ color: '#5647b5' }}>
            ➕ Dodaj novu vježbu: "{value}"
          </Text>
        </TouchableOpacity>
      )}
      {addingNew && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ marginBottom: 6 }}>Odaberi mišićnu skupinu:</Text>
          <Picker
            selectedValue={selectedMuscleGroup}
            onValueChange={(itemValue) => setSelectedMuscleGroup(itemValue)}
          >
            {muscleGroups.map((group) => (
              <Picker.Item key={group} label={group} value={group} />
            ))}
          </Picker>

          <TouchableOpacity
            onPress={async () => {
              const newExercise = {
                name: value,
                muscle_group: selectedMuscleGroup,
                description: '',
              };
              const updatedList = [...exerciseList, newExercise];

              try {
                await AsyncStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify(updatedList)
                );
                setExerciseList(updatedList);
                onChange(value);
                setAddingNew(false);
                setShowSuggestions(false);
                console.log('✅ Spremljeno:', newExercise);
              } catch (err) {
                console.log('Greška:', err);
              }
            }}
            style={[
              styles.addNewExercise,
              { marginTop: 10, backgroundColor: '#d0f0ff' },
            ]}
          >
            <Text style={{ color: '#333' }}>💾 Spremi novu vježbu</Text>
          </TouchableOpacity>
        </View>
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
