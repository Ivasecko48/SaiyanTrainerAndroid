import {
  Modal,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { AVATARS } from './avatars';

const ORANGE = '#fc7138';

// Mali prozor za odabir avatara: mreža glava, dodir odmah bira lika
const AvatarPickerModal = ({ visible, selected, saving, onSelect, onClose }) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    {/* Dodir izvan prozora ga zatvara; dodir unutar njega ne */}
    <Pressable style={styles.overlay} onPress={saving ? undefined : onClose}>
      <Pressable style={styles.content} onPress={() => {}}>
        <Text style={styles.title}>Choose your Saiyan</Text>

        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {AVATARS.map((avatar) => {
            const active = avatar.id === selected;
            return (
              <TouchableOpacity
                key={avatar.id}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => onSelect(avatar.id)}
                disabled={saving}
              >
                <Image source={avatar.image} style={styles.image} />
                <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
                  {avatar.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {saving ? (
          <ActivityIndicator color={ORANGE} style={styles.footer} />
        ) : (
          <TouchableOpacity style={styles.footer} onPress={onClose}>
            <Text style={styles.close}>Zatvori</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    width: '88%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: ORANGE,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  item: {
    width: '30%',
    margin: '1.5%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemActive: {
    borderColor: ORANGE,
    backgroundColor: '#fff3ec',
  },
  image: {
    width: 72,
    height: 72,
  },
  name: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  nameActive: {
    color: ORANGE,
    fontWeight: 'bold',
  },
  footer: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  close: {
    fontSize: 16,
    color: ORANGE,
    fontWeight: '600',
  },
});

export default AvatarPickerModal;
