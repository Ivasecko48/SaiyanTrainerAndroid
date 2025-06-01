import Goku from '@/assets/images/dragon-ball-super-iphone.jpg';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={Goku}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* content */}
      </ImageBackground>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    margin: 0,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    height: '75%',
  },
});

export default HomeScreen;
