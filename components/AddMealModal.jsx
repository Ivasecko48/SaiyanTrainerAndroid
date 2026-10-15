import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Modal } from 'react-native';
import ExerciseAutocompleteInput from './ExerciseAutoInput';
import NumberChips from './NumberChips';
import { findFood } from '@/services/foodCatalog';
import { parseNumber } from '@/utils/parseNumber';

// Poruka na vrhu prozora kad je otvoren iz scoutera (skenera barkoda)
const SCAN_HINTS = {
  off: 'Podaci iz baze Open Food Facts. Provjeri ih s deklaracijom.',
  local: 'Scouter je prepoznao proizvod iz tvojih namirnica.',
  missing:
    'Proizvoda nema u bazi. Upiši naziv i vrijednosti s deklaracije, a scouter će ga idući put prepoznati.',
};
const NO_CALORIES_HINT = 'Baza nema kalorije za ovaj proizvod. Upiši ih s deklaracije.';

// Brzi gumbi za količinu kad proizvod ima porciju ili pakiranje (skenirani proizvodi)
const portionOptions = (food) => {
  if (!food?.servingGrams && !food?.packageGrams) return [];
  const unit = food.unit || 'g';
  const options = [{ grams: 100, label: `100 ${unit}` }];
  const add = (grams, label) => {
    if (grams && !options.some((option) => option.grams === grams)) {
      options.push({ grams, label });
    }
  };
  add(food.servingGrams, `1 porcija (${food.servingGrams} ${unit})`);
  add(food.packageGrams, `Pakiranje (${food.packageGrams} ${unit})`);
  return options;
};

const AddMealModal = ({
  modalVisible,
  onClose,
  catalog,
  mealName,
  setMealName,
  onSelectFood,
  food,
  scanSource,
  grams,
  setGrams,
  calories,
  setCalories,
  protein,
  setProtein,
  fat,
  setFat,
  carbs,
  setCarbs,
  editingMeal,
  handleSave,
}) => {
  const isNewName =
    mealName.trim().length > 0 && !findFood(catalog, mealName);
  const portions = portionOptions(food);
  const scanHint =
    scanSource === 'off' && food?.kcal === null ? NO_CALORIES_HINT : SCAN_HINTS[scanSource];

  return (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {' '}
            {editingMeal ? 'Edit Meal' : 'Add Meal'}
          </Text>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {scanHint ? <Text style={styles.scanHint}>{scanHint}</Text> : null}
            <View style={styles.modalSelect}>
              <Text style={styles.label}>Are you even trying to get big?</Text>
            </View>
            <ExerciseAutocompleteInput
              value={mealName}
              onChange={setMealName}
              onSelect={onSelectFood}
              catalog={catalog}
              placeholder="Jesi li jeo?"
              groupKey="category"
            />
            {isNewName && (
              <Text style={styles.hint}>
                Nova namirnica: spremit će se u tvoj popis.
              </Text>
            )}

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Grami</Text>
              <TextInput
                style={styles.textInput}
                placeholder="100 g"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(grams ?? '')}
                onChangeText={setGrams}
              />
            </View>
            {portions.length > 0 && (
              <View style={styles.portions}>
                <NumberChips
                  options={portions.map((option) => option.grams)}
                  value={parseNumber(grams, NaN)}
                  onChange={(amount) => setGrams(String(amount))}
                  labelFor={(amount) =>
                    portions.find((option) => option.grams === amount).label
                  }
                />
              </View>
            )}

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Calories</Text>
              <TextInput
                style={styles.textInput}
                placeholder=">200kcal"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(calories ?? '')}
                onChangeText={setCalories}
              />
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Protein</Text>
              <TextInput
                style={styles.textInput}
                placeholder=">10g proto"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(protein ?? '')}
                onChangeText={setProtein}
              />
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Masti</Text>
              <TextInput
                style={styles.textInput}
                placeholder="g masti"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(fat ?? '')}
                onChangeText={setFat}
              />
            </View>

            <View style={styles.modalSelect}>
              <Text style={styles.label}>Ugljikohidrati</Text>
              <TextInput
                style={styles.textInput}
                placeholder="g UH"
                placeholderTextColor={'#888'}
                keyboardType="decimal-pad"
                value={String(carbs ?? '')}
                onChangeText={setCarbs}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '84%',
    maxHeight: '80%',
  },
  body: {
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  textInput: {
    width: 110,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333', // inače bijel tekst kad je mobitel u tamnom načinu
    marginBottom: 12,
    marginRight: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  modalSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  scanHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7a3a12',
    backgroundColor: '#fff3ec',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  portions: {
    marginTop: -8,
    marginBottom: 14,
  },
});

export default AddMealModal;
