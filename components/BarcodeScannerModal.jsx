import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchProduct } from '@/services/openFoodFacts';
import { findFoodByBarcode } from '@/services/foodCatalog';

// Barkodovi s proizvoda iz dućana
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'];
// Boje Vegetinog scoutera
const GREEN = '#5dff7a';
const LIGHT_GREEN = '#c8ffd2';
const WARN = '#ffb03b';
const GLASS = 'rgba(40, 255, 110, 0.10)';
const SHADE = 'rgba(0, 32, 10, 0.55)';
const PANEL = 'rgba(0, 22, 8, 0.85)';
const MONO = 'monospace';
// Okvir za nišanjenje: barkod je širok i nizak
const WINDOW_HEIGHT = 150;
const BAND_HEIGHT = 8;
// Brojanje power levela i pauza prije prelaska na prozor "Add Meal" (ms)
const COUNT_MS = 700;
const HOLD_MS = 1000;

// Kratka vibracija; tiho se preskače ako je uređaj ne podržava
const vibrate = (type) => Haptics.notificationAsync(type).catch(() => {});

const HudButton = ({ label, onPress, subtle, style }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.hudButton, subtle && styles.hudButtonSubtle, style]}
  >
    <Text style={[styles.hudButtonText, subtle && styles.hudButtonTextSubtle]}>{label}</Text>
  </TouchableOpacity>
);

// Sadržaj skenera. Montira se tek kad se prozor otvori, pa svako otvaranje
// kreće od početka, a kamera i svjetiljka se gase čim se prozor zatvori.
const Scouter = ({ onClose, catalog, onResult }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const windowWidth = Math.min(width - 72, 320);
  // Dozvola za kameru traži se odmah pri otvaranju
  const [permission, requestPermission] = useCameraPermissions({ request: true });
  // 'scan' → 'loading' → 'found' | 'missing' | 'error'
  const [phase, setPhase] = useState('scan');
  const [barcode, setBarcode] = useState(null);
  const [result, setResult] = useState(null); // { food, source: 'local' | 'off' }
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const [torch, setTorch] = useState(false);
  const [power, setPower] = useState(0);
  // Kamera javlja isti barkod više puta zaredom; obrađuje se samo prvi
  const lockRef = useRef(false);
  const doneRef = useRef(false);
  const mountedRef = useRef(true);

  const line = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const lock = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Linija koja skenira okvir i treptanje teksta
  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1400, easing: ease, useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 1400, easing: ease, useNativeDriver: true }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.25, duration: 450, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    sweep.start();
    pulse.start();
    return () => {
      sweep.stop();
      pulse.stop();
    };
  }, []);

  // Rezultat ide u prozor "Add Meal", samo jednom
  const sendResult = (food, source) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onResult({ barcode, food, source });
  };

  // Power level se izbroji do kalorija, pa scouter sam prelazi na prozor "Add Meal".
  // Dodir na očitanje preskače čekanje.
  useEffect(() => {
    if (phase !== 'found') return undefined;
    const target = result.food.kcal ?? 0;
    const start = Date.now();
    let frame;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / COUNT_MS);
      setPower(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const timer = setTimeout(() => sendResult(result.food, result.source), COUNT_MS + HOLD_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [phase]);

  const lookup = async (code) => {
    setPhase('loading');
    setError(null);
    // Proizvod koji je korisnik već spremio s ovim barkodom ne treba tražiti u bazi
    const known = findFoodByBarcode(catalog, code);
    const response = known ? { data: known, error: null } : await fetchProduct(code);
    if (!mountedRef.current) return;

    if (response.error) {
      setError(response.error);
      setPhase('error');
      vibrate(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const food = response.data;
    // Proizvod bez naziva i bez kalorija ne pomaže, isto kao da ga nema
    if (!food || (!food.name && food.kcal === null)) {
      setPhase('missing');
      vibrate(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setResult({ food, source: known ? 'local' : 'off' });
    setPhase('found');
    vibrate(Haptics.NotificationFeedbackType.Success);
  };

  const handleBarcode = ({ data }) => {
    const code = String(data ?? '').trim();
    // Samo brojčani barkodovi proizvoda (EAN/UPC)
    if (lockRef.current || !/^\d{8,14}$/.test(code)) return;
    lockRef.current = true;
    setBarcode(code);
    // Strelice i okvir se zatvore oko mete
    Animated.spring(lock, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    lookup(code);
  };

  const scanAgain = () => {
    lockRef.current = false;
    lock.setValue(0);
    setBarcode(null);
    setResult(null);
    setError(null);
    setPower(0);
    setPhase('scan');
  };

  // Prazna forma; barkod se zapamti uz ono što korisnik upiše
  const typeManually = () => sendResult(null, 'missing');

  if (!permission) {
    return (
      <View style={[styles.root, styles.center]}>
        <Animated.Text style={[styles.status, { opacity: blink }]}>POKREĆEM SCOUTER…</Animated.Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={[styles.status, styles.warn]}>SCOUTER NE VIDI</Text>
        <Text style={[styles.text, styles.centerText]}>
          Za skeniranje barkoda scouteru treba kamera.
        </Text>
        <View style={styles.permissionButtons}>
          {permission.canAskAgain ? (
            <HudButton label="Dozvoli kameru" onPress={requestPermission} />
          ) : (
            <HudButton label="Otvori postavke" onPress={() => Linking.openSettings()} />
          )}
          <HudButton label="Zatvori" onPress={onClose} subtle />
        </View>
      </View>
    );
  }

  const lineY = line.interpolate({
    inputRange: [0, 1],
    outputRange: [0, WINDOW_HEIGHT - BAND_HEIGHT],
  });
  const squeeze = lock.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const leftArrowX = lock.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
  const rightArrowX = lock.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  const renderReadout = () => {
    if (cameraError) {
      return (
        <>
          <Text style={[styles.status, styles.warn]}>KAMERA NE RADI</Text>
          <Text style={styles.text}>
            Scouter ne može upaliti kameru. Zatvori ga i pokušaj ponovno.
          </Text>
        </>
      );
    }

    switch (phase) {
      case 'loading':
        return (
          <>
            <Text style={styles.meta}>META {barcode}</Text>
            <Animated.Text style={[styles.status, { opacity: blink }]}>
              ▸ OČITAVAM POWER LEVEL…
            </Animated.Text>
          </>
        );

      case 'found': {
        const { food, source } = result;
        return (
          <Pressable onPress={() => sendResult(food, source)}>
            <Text style={styles.meta}>META {barcode}</Text>
            <Text style={styles.status}>POWER LEVEL</Text>
            <View style={styles.powerRow}>
              <Text style={styles.power}>{food.kcal === null ? '???' : power}</Text>
              <Text style={styles.powerUnit}>
                kcal / {food.grams} {food.unit || 'g'}
              </Text>
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {food.name || 'Proizvod bez naziva'}
            </Text>
            <Text style={styles.source}>
              {source === 'local' ? 'Iz tvojih namirnica' : 'Izvor: Open Food Facts'}
            </Text>
          </Pressable>
        );
      }

      case 'missing':
        return (
          <>
            <Text style={styles.meta}>META {barcode}</Text>
            <Text style={[styles.status, styles.warn]}>NEPOZNATA META</Text>
            <Text style={styles.text}>
              Proizvoda nema u bazi. Upiši ga jednom i scouter će ga idući put prepoznati.
            </Text>
            <View style={styles.buttons}>
              <HudButton label="Skeniraj opet" onPress={scanAgain} subtle style={styles.rowButton} />
              <HudButton label="Upiši ručno" onPress={typeManually} style={styles.rowButton} />
            </View>
          </>
        );

      case 'error':
        return (
          <>
            <Text style={styles.meta}>META {barcode}</Text>
            <Text style={[styles.status, styles.warn]}>SCOUTER JE IZGUBIO VEZU</Text>
            <Text style={styles.text}>{error}</Text>
            <View style={styles.buttons}>
              <HudButton
                label="Pokušaj opet"
                onPress={() => lookup(barcode)}
                subtle
                style={styles.rowButton}
              />
              <HudButton label="Upiši ručno" onPress={typeManually} style={styles.rowButton} />
            </View>
          </>
        );

      default:
        return (
          <>
            <Animated.Text style={[styles.status, { opacity: blink }]}>▸ TRAŽIM METU…</Animated.Text>
            <Text style={styles.text}>Usmjeri kameru na barkod proizvoda.</Text>
          </>
        );
    }
  };

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        // Bez callbacka kamera ne traži barkodove dok se proizvod učitava ili prikazuje
        onBarcodeScanned={phase === 'scan' ? handleBarcode : undefined}
        onMountError={() => setCameraError(true)}
      />

      {/* Zeleno staklo scoutera, tamnije oko okvira za nišanjenje */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[StyleSheet.absoluteFill, styles.glass]} />
        <View style={styles.shadeTop} />
        <View style={[styles.windowRow, { height: WINDOW_HEIGHT }]}>
          <View style={[styles.shadeSide, styles.shadeLeft]}>
            <Animated.View style={[styles.arrowRight, { transform: [{ translateX: leftArrowX }] }]} />
          </View>
          <Animated.View
            style={{ width: windowWidth, height: WINDOW_HEIGHT, transform: [{ scale: squeeze }] }}
          >
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            {phase === 'scan' && (
              <Animated.View style={[styles.scanBand, { transform: [{ translateY: lineY }] }]}>
                <View style={styles.scanCore} />
              </Animated.View>
            )}
          </Animated.View>
          <View style={[styles.shadeSide, styles.shadeRight]}>
            <Animated.View style={[styles.arrowLeft, { transform: [{ translateX: rightArrowX }] }]} />
          </View>
        </View>
        <View style={styles.shadeBottom} />
      </View>

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <View style={styles.badge}>
          <Animated.View style={[styles.dot, { opacity: blink }]} />
          <Text style={styles.badgeText}>SCOUTER</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            onPress={() => setTorch((on) => !on)}
            style={styles.iconButton}
            accessibilityLabel={torch ? 'Ugasi svjetiljku' : 'Upali svjetiljku'}
          >
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color={GREEN} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={styles.iconButton}
            accessibilityLabel="Zatvori skener"
          >
            <Ionicons name="close" size={24} color={GREEN} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.panel, { bottom: insets.bottom + 24 }]}>{renderReadout()}</View>
    </View>
  );
};

// Skener barkoda u stilu Vegetinog scoutera. Nakon skeniranja javlja
// onResult({ barcode, food, source }); food je null kad proizvod nije pronađen.
const BarcodeScannerModal = ({ visible, onClose, catalog, onResult }) => (
  <Modal
    visible={visible}
    animationType="fade"
    backdropColor="#000"
    statusBarTranslucent
    navigationBarTranslucent
    onRequestClose={onClose}
  >
    {visible && <Scouter onClose={onClose} catalog={catalog} onResult={onResult} />}
  </Modal>
);

const glow = (color, radius) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: radius,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  centerText: {
    textAlign: 'center',
  },
  glass: {
    backgroundColor: GLASS,
  },
  shadeTop: {
    flex: 1,
    backgroundColor: SHADE,
  },
  // Okvir je malo iznad sredine, da ispod stane očitanje
  shadeBottom: {
    flex: 1.5,
    backgroundColor: SHADE,
  },
  windowRow: {
    flexDirection: 'row',
  },
  shadeSide: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: SHADE,
  },
  shadeLeft: {
    alignItems: 'flex-end',
  },
  shadeRight: {
    alignItems: 'flex-start',
  },
  // Trokuti nacrtani rubovima (bez SVG-a)
  arrowRight: {
    width: 0,
    height: 0,
    marginRight: 8,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: GREEN,
  },
  arrowLeft: {
    width: 0,
    height: 0,
    marginLeft: 8,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: GREEN,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: GREEN,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanBand: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: BAND_HEIGHT,
    justifyContent: 'center',
    backgroundColor: 'rgba(93, 255, 122, 0.18)',
  },
  scanCore: {
    height: 2,
    backgroundColor: GREEN,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PANEL,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: GREEN,
  },
  badgeText: {
    fontFamily: MONO,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: GREEN,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 10,
    backgroundColor: PANEL,
  },
  meta: {
    fontFamily: MONO,
    fontSize: 12,
    color: GREEN,
    opacity: 0.75,
    marginBottom: 4,
  },
  status: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: GREEN,
    ...glow(GREEN, 6),
  },
  warn: {
    color: WARN,
    textShadowColor: WARN,
  },
  text: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 18,
    color: LIGHT_GREEN,
    marginTop: 6,
  },
  powerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  power: {
    fontFamily: MONO,
    fontSize: 48,
    fontWeight: 'bold',
    color: GREEN,
    ...glow(GREEN, 12),
  },
  powerUnit: {
    fontFamily: MONO,
    fontSize: 13,
    color: GREEN,
    marginLeft: 8,
    marginBottom: 10,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#eafff0',
    marginTop: 2,
  },
  source: {
    fontFamily: MONO,
    fontSize: 11,
    color: GREEN,
    opacity: 0.7,
    marginTop: 6,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  permissionButtons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 20,
  },
  rowButton: {
    flex: 1,
  },
  hudButton: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: GREEN,
  },
  hudButtonSubtle: {
    backgroundColor: 'transparent',
  },
  hudButtonText: {
    fontFamily: MONO,
    fontWeight: 'bold',
    color: '#03210c',
  },
  hudButtonTextSubtle: {
    color: GREEN,
  },
});

export default BarcodeScannerModal;
