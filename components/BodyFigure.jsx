import { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, Animated, StyleSheet } from 'react-native';
import { CANVAS, LAYERS } from './bodyLayers';

const NEUTRAL_FILL = '#fff';
const FLIP_MS = 150;

/**
 * Jedno tijelo koje se dodirom okreće: prednja strana <-> stražnja strana.
 *
 * - `side`    'front' ili 'back' (stanje drži roditelj)
 * - `onPress` poziva se na dodir, roditelj tada promijeni `side`
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

  return (
    <Pressable
      style={[styles.root, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Okreni tijelo"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {ready && (
        <Animated.View
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
                    left: x * scale,
                    top: y * scale,
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
