import { View, Text } from 'react-native';
import { tableStyles, ACTIONS_WIDTH } from './tableStyles';

// Zaglavlje tablice; `columns` je EXERCISE_COLUMNS ili MEAL_COLUMNS
const TableHeader = ({ columns }) => (
  <View style={tableStyles.header}>
    {columns.map((column, index) => (
      <Text
        key={column.label}
        style={[
          tableStyles.headerText,
          index === 0 && tableStyles.headerFirst,
          { flex: column.flex },
        ]}
      >
        {column.label}
      </Text>
    ))}
    <View style={{ width: ACTIONS_WIDTH }} />
  </View>
);

export default TableHeader;
