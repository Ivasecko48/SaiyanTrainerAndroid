import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { tableStyles, MEAL_COLUMNS } from './tableStyles';

const [nameCol, proteinCol, caloriesCol] = MEAL_COLUMNS;

const MealRender = ({ item, onDelete, onEdit }) => {
  return (
    <View style={tableStyles.row}>
      <Pressable style={{ flex: nameCol.flex }} onPress={() => onEdit(item)}>
        {/* Stari obroci nemaju spremljen naziv (null), pa im dajemo zamjenski tekst */}
        <Text style={tableStyles.name} numberOfLines={1}>
          {item.mealName || 'Bez naziva'}
        </Text>
      </Pressable>

      <Text style={[tableStyles.cell, { flex: proteinCol.flex }]}>
        {item.protein} g
      </Text>
      <Text style={[tableStyles.cell, { flex: caloriesCol.flex }]}>
        {item.calories}
      </Text>

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
