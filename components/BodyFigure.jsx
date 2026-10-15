import { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { CANVAS, LAYERS } from './bodyLayers';

const NEUTRAL_FILL = '#fff';
const FLIP_MS = 150;
// Platno počinje iznad tijela (kosa ide iznad glave), pa su koordinate pomaknute
const ORIGIN_X = CANVAS.left ?? 0;
const ORIGIN_Y = CANVAS.top ?? 0;

/**
 * Jedno tijelo koje se dodirom okreće: prednja strana <-> stražnja strana.
 *
 * - `side`    'front' ili 'back' (stanje drži roditelj)
 * - `onPress` poziva se na dodir s { x, y } u jedinicama tijela (0..200, 0..420; kosa je
 *              iznad, y < 0), ili s null ako je dodir izvan slike
 * - `colors`  objekt { ključ_mišića: boja }, mišići bez boje ostaju bijeli
 *
 * Tijelo je složeno od PNG slojeva (components/bodyLayers.js). Sloj ispune svake
 * mišićne skupine boji se preko `tintColor`, a obrubi se crtaju iznad njega.
 * Ne treba nikakva nativna biblioteka, pa radi u Expo Gou i u svakom buildu.
 */
const BodyFigure = ({ colors = {}, side = 'front', onPress, style }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [shown, setShown] = useState(side); // strana koja se trenutno crta
  const scaleX = useRef(new Animated.Value(1)).current;
  const latestSide = useRef(side);
  latestSide.current = side;

  // Okretanje: figura se suzi na rub, zamijeni se strana, pa se opet raširi
  useEffect(() => {
    if (side === shown) return;

    Animated.timing(scaleX, {
      toValue: 0.01,
      duration: FLIP_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setShown(latestSide.current); // uvijek najnovija tražena strana
      Animated.timing(scaleX, {
        toValue: 1,
        duration: FLIP_MS,
        useNativeDriver: true,
      }).start();
    });
  }, [side]);

  const scale = Math.min(size.width / CANVAS.width, size.height / CANVAS.height);
  const ready = Number.isFinite(scale) && scale > 0;

  const handlePress = (event) => {
    if (!onPress) return;
    if (!ready) {
      onPress(null);
      return;
    }

    // slika je centrirana u Pressable-u; preračunaj dodir u jedinice tijela
    const { locationX, locationY } = event.nativeEvent;
    const left = (size.width - CANVAS.width * scale) / 2;
    const top = (size.height - CANVAS.height * scale) / 2;
    const x = (locationX - left) / scale + ORIGIN_X;
    const y = (locationY - top) / scale + ORIGIN_Y;

    const insideFigure =
      x >= ORIGIN_X &&
      x <= ORIGIN_X + CANVAS.width &&
      y >= ORIGIN_Y &&
      y <= ORIGIN_Y + CANVAS.height;
    onPress(insideFigure ? { x, y } : null);
  };

  return (
    <Pressable
      style={[styles.root, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Tijelo: dodirni mišić ili prazno mjesto za okretanje"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {ready && (
        <Animated.View
          pointerEvents="none"
          style={{
            width: CANVAS.width * scale,
            height: CANVAS.height * scale,
            transform: [{ scaleX }],
          }}
        >
          {LAYERS.filter((layer) => layer.view === shown).map((layer) => {
            const [x, y, w, h] = layer.box;
            return (
              <Image
                key={layer.id}
                source={layer.src}
                resizeMode="stretch"
                fadeDuration={0}
                style={[
                  {
                    position: 'absolute',
                    left: (x - ORIGIN_X) * scale,
                    top: (y - ORIGIN_Y) * scale,
                    width: w * scale,
                    height: h * scale,
                  },
                  layer.kind === 'fill' && {
                    tintColor: colors[layer.muscle] || NEUTRAL_FILL,
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BodyFigure;
