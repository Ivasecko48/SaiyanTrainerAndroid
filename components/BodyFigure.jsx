import { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { CANVAS, LAYERS } from './bodyLayers';

const NEUTRAL_FILL = '#fff';

/**
 * Dvije figure jedna ispod druge: gore prednja, dolje stražnja strana.
 * `colors` je objekt { ključ_mišića: boja }. Mišići bez boje ostaju bijeli.
 *
 * Tijelo je složeno od PNG slojeva (components/bodyLayers.js). Sloj ispune svake
 * mišićne skupine boji se preko `tintColor`, a obrubi se crtaju iznad njega.
 * Ne treba nikakva nativna biblioteka, pa radi u Expo Gou i u svakom buildu.
 * Slika se sama skalira na veličinu roditelja.
 */
const BodyFigure = ({ colors = {}, style }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const scale = Math.min(size.width / CANVAS.width, size.height / CANVAS.height);
  const ready = Number.isFinite(scale) && scale > 0;

  return (
    <View
      style={[styles.root, style]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
      }}
    >
      {ready && (
        <View style={{ width: CANVAS.width * scale, height: CANVAS.height * scale }}>
          {LAYERS.map((layer) => {
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
        </View>
      )}
    </View>
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
