import { View, StyleSheet } from 'react-native';

// Oblačić u obliku Flying Nimbusa (Gokuov žuti oblak), složen od običnih View-ova
// pa se rasteže prema duljini teksta bez izobličenja.
// Isti oblik crta se u tri sloja: tamni obrub (malo veći), zlatna sjena i svijetla
// ispuna koja je malo uvučena i podignuta, pa uz donji rub i između puhova ostane
// zlatna sjena. Tako oblak ima jedan neprekinut obrub i izgleda "napuhano".

const FILL = '#ffe27a';
const SHADE = '#f2bd35';
const OUTLINE = '#c98a00';
const SHINE = 'rgba(255,255,255,0.75)';
const BORDER = 2.5;
const RADIUS = 34;
const INSET = 3; // koliko je ispuna uvučena (sjena je dolje dvostruko deblja)

// Rasporedi puhova: [lijevo u %, promjer]. Neparne varijante se zrcale.
const PRESETS = [
  {
    top: [[13, 60], [35, 76], [60, 68], [84, 56]],
    bottom: [[22, 50], [50, 62], [78, 50]],
    sides: { left: 56, right: 50 },
  },
  {
    top: [[11, 52], [29, 68], [51, 80], [74, 64], [90, 46]],
    bottom: [[27, 56], [58, 60], [84, 44]],
    sides: { left: 48, right: 56 },
  },
  {
    top: [[17, 70], [43, 60], [67, 74], [89, 50]],
    bottom: [[15, 46], [41, 58], [71, 54]],
    sides: { left: 58, right: 46 },
  },
];

const presetFor = (variant) => {
  const preset = PRESETS[Math.abs(variant) % PRESETS.length];
  if (variant % 2 === 0) return preset;
  const flip = (list) => list.map(([left, d]) => [100 - left, d]);
  return {
    top: flip(preset.top),
    bottom: flip(preset.bottom),
    sides: { left: preset.sides.right, right: preset.sides.left },
  };
};

// Svi dijelovi oblaka za jedan sloj (extra = koliko je sloj veći od oblika,
// negativno = uvučen; lift = pomak prema gore)
const Layer = ({ preset, color, extra, lift = 0 }) => {
  const circle = (d) => ({
    position: 'absolute',
    width: d + extra * 2,
    height: d + extra * 2,
    borderRadius: (d + extra * 2) / 2,
    backgroundColor: color,
  });

  return (
    <View style={[styles.layer, lift ? { transform: [{ translateY: -lift }] } : null]}>
      <View
        style={{
          position: 'absolute',
          top: -extra,
          left: -extra,
          right: -extra,
          bottom: -extra,
          borderRadius: RADIUS + extra,
          backgroundColor: color,
        }}
      />
      {preset.top.map(([left, d]) => (
        <View
          key={`t${left}`}
          style={[circle(d), { left: `${left}%`, marginLeft: -(d / 2 + extra), top: -d / 2 + 12 - extra }]}
        />
      ))}
      {preset.bottom.map(([left, d]) => (
        <View
          key={`b${left}`}
          style={[circle(d), { left: `${left}%`, marginLeft: -(d / 2 + extra), bottom: -d / 2 + 14 - extra }]}
        />
      ))}
      <View
        style={[
          circle(preset.sides.left),
          { left: -preset.sides.left / 2 + 14 - extra, top: '38%', marginTop: -(preset.sides.left / 2 + extra) },
        ]}
      />
      <View
        style={[
          circle(preset.sides.right),
          { right: -preset.sides.right / 2 + 14 - extra, top: '42%', marginTop: -(preset.sides.right / 2 + extra) },
        ]}
      />
    </View>
  );
};

/**
 * Oblačić s tekstom. variant mijenja raspored puhova (svaki korak vodiča
 * izgleda malo drukčije).
 */
const NimbusBubble = ({ children, variant = 0, style }) => {
  const preset = presetFor(variant);
  const [first, second] = preset.top;

  return (
    <View style={[styles.wrap, style]}>
      <Layer preset={preset} color={OUTLINE} extra={BORDER} />
      <Layer preset={preset} color={SHADE} extra={0} />
      <Layer preset={preset} color={FILL} extra={-INSET} lift={INSET} />
      {/* odsjaji na dva gornja puha */}
      <View style={[styles.shine, { left: `${first[0]}%`, top: -first[1] / 2 + 20, width: 22, height: 9 }]} />
      <View style={[styles.shine, { left: `${second[0]}%`, top: -second[1] / 2 + 18, width: 28, height: 10 }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

// Mali oblačić za trag između elementa i velikog oblaka, sjenčan kao i veliki
export const CloudPuff = ({ size }) => {
  const border = size > 12 ? BORDER : 2;
  const inner = size - border * 2 - (size > 18 ? 3 : size > 12 ? 2 : 1);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: SHADE,
        borderWidth: border,
        borderColor: OUTLINE,
        alignItems: 'center',
      }}
    >
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: FILL }} />
    </View>
  );
};

const styles = StyleSheet.create({
  // razmaci da puhovi koji vire iz tijela oblaka ostanu unutar okvira
  wrap: {
    marginTop: 28,
    marginBottom: 24,
    marginHorizontal: 20,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shine: {
    position: 'absolute',
    marginLeft: -16,
    backgroundColor: SHINE,
    borderRadius: 10,
    transform: [{ rotate: '-14deg' }],
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
});

export default NimbusBubble;
