import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { tableStyles, MEAL_COLUMNS } from './tableStyles';

const [nameCol, caloriesCol, proteinCol, fatCol, carbsCol] = MEAL_COLUMNS;

// Stari obroci nemaju masti i UH, pa za njih piše "–"
const show = (value) => (value === null || value === undefined ? '–' : value);

const MealRender = ({ item, onDelete, onEdit }) => {
  const cell = (column) => [tableStyles.cell, tableStyles.cellSmall, { flex: column.flex }];

  return (
    <View style={tableStyles.row}>
      <Pressable style={{ flex: nameCol.flex }} onPress={() => onEdit(item)}>
        {/* Stari obroci nemaju spremljen naziv (null), pa im dajemo zamjenski tekst */}
        <Text style={tableStyles.name} numberOfLines={1}>
          {item.mealName || 'Bez naziva'}
        </Text>
      </Pressable>

      <Text style={cell(caloriesCol)}>{show(item.calories)}</Text>
      <Text style={cell(proteinCol)}>{show(item.protein)}</Text>
      <Text style={cell(fatCol)}>{show(item.fat)}</Text>
      <Text style={cell(carbsCol)}>{show(item.carbs)}</Text>

      <View style={tableStyles.actions}>
        <TouchableOpacity hitSlop={8} onPress={() => onEdit(item)}>
          <Feather name="edit-3" size={18} color="#65617e" />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={8} onPress={() => onDelete(item.$id)}>
          <Feather name="trash-2" size={18} color="#d9534f" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MealRender;
