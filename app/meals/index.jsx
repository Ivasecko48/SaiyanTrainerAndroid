import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

const MealsScreen = () => {
  return (
    <View style={StyleSheet.container}>
      <Text>Meals</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
});
export default MealsScreen;
