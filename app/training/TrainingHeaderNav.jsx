// components/TrainingHeaderNav.jsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function TrainingHeaderNav() {
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      <Link href="/training" asChild>
        <TouchableOpacity>
          <Text
            style={{
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            {' '}
            Log
          </Text>
        </TouchableOpacity>
      </Link>

      <Link href="/meals" asChild>
        <TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Meals</Text>
        </TouchableOpacity>
      </Link>

      <Link href="/muscleGroups" asChild>
        <TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>MGs</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
