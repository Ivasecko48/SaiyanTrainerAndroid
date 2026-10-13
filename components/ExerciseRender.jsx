import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatReps } from '@/utils/reps';
import { exerciseVolume, formatVolume } from '@/utils/volume';
import { tableStyles, EXERCISE_COLUMNS } from './tableStyles';

const [nameCol, kgCol, setsCol, repsCol, rpeCol] = EXERCISE_COLUMNS;

const ExerciseRender = ({ item, onDelete, onEdit }) => {
  const volume = exerciseVolume(item);

  return (
    <View style={tableStyles.row}>
      <Pressable style={{ flex: nameCol.flex }} onPress={() => onEdit(item)}>
        <Text style={tableStyles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {/* vježbe bez kilaže (vlastita težina) nemaju volumen */}
        {volume > 0 && (
          <Text style={tableStyles.subText} numberOfLines={1}>
            Vol. {formatVolume(volume)}
          </Text>
        )}
      </Pressable>

      <Text style={[tableStyles.cell, { flex: kgCol.flex }]}>
        {item.weight}
      </Text>
      <Text style={[tableStyles.cell, { flex: setsCol.flex }]}>
        {item.sets}
      </Text>
      <Text style={[tableStyles.cell, { flex: repsCol.flex }]}>
        {formatReps(item.reps)}
      </Text>
      <Text style={[tableStyles.cell, { flex: rpeCol.flex }]}>{item.rpe}</Text>

      <View style={tableStyles.actions}>
        <TouchableOpacity hitSlop={8} onPress={() => onEdit(item)}>
          <Feather name="edit-3" size={18} color="#7441eada" />
        </TouchableOpacity>
        <TouchableOpacity hitSlop={8} onPress={() => onDelete(item.$id)}>
          <Feather name="trash-2" size={18} color="#d9544fe0" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ExerciseRender;
