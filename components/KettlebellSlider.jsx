import { Fragment, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

const ORANGE = '#fc7138';
const IRON = '#3b3b3b';
const TRACK_BG = '#f6dccd';

// Udaljenost od vrha kettlebella do središta tijela i ukupna visina,
// u odnosu na njegovu širinu (ručka 0.5 + tijelo 0.9 - preklop 0.18)
const BODY_CENTER = 0.77;
const KETTLEBELL_HEIGHT = 1.22;

/**
 * Kettlebell nacrtan od običnih View-ova: ručka (obrnuto U) + okruglo tijelo
 * na kojem piše vrijednost.
 */
export const Kettlebell = ({ label, size = 46 }) => {
  // Široka, plosnata ručka kao na pravom kettlebellu (uska bi izgledala kao lokot)
  const handleWidth = size * 0.84;
  const bodyHeight = size * 0.9;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View
        style={{
          width: handleWidth,
          height: size * 0.5,
          borderWidth: Math.max(3, size * 0.13),
          borderBottomWidth: 0,
          borderColor: IRON,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
        }}
      />
      <View
        style={[
          styles.body,
          {
            width: size,
            height: bodyHeight,
            marginTop: -size * 0.18,
            borderRadius: size / 2,
            borderBottomLeftRadius: size * 0.36,
            borderBottomRightRadius: size * 0.36,
          },
        ]}
      >
        <View
          style={[
            styles.shine,
            {
              top: bodyHeight * 0.14,
              left: size * 0.17,
              width: size * 0.24,
              height: size * 0.13,
              borderRadius: size * 0.1,
            },
          ]}
        />
        <Text style={[styles.label, { fontSize: size * 0.27 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const range = (min, max, every) =>
  Array.from({ length: Math.floor((max - min) / every) + 1 }, (_, i) => min + i * every);

/**
 * Pomična traka s crticama; umjesto crtice po traci se pomiče kettlebell.
 *
 * - vertical       okomita traka (visina) ili vodoravna (težina)
 * - length         visina okomite trake; vodoravna zauzme cijelu širinu retka
 * - minorEvery / majorEvery / labelEvery   razmak kratkih crtica, dugih crtica i brojeva
 * - onDragStart / onDragEnd   roditelj tu gasi skrolanje ekrana dok se vuče
 *
 * Sav crtež je u jednom sloju s pointerEvents="none", pa dodir uvijek pogađa
 * samu traku i locationX/Y su u njezinim koordinatama.
 */
const KettlebellSlider = ({
  value,
  min,
  max,
  step = 1,
  vertical = false,
  length = 300,
  minorEvery,
  majorEvery,
  labelEvery,
  formatValue = String,
  onChange,
  onDragStart,
  onDragEnd,
  kettlebellSize = 46,
  trackThickness = vertical ? 8 : 12,
}) => {
  const [width, setWidth] = useState(0);
  const size = vertical ? length : width;

  // Prostor na krajevima da kettlebell ne izađe izvan trake
  const pad = vertical ? kettlebellSize * 0.8 : kettlebellSize / 2 + 2;
  const usable = Math.max(1, size - 2 * pad);
  const toPos = (v) =>
    vertical
      ? pad + ((max - v) / (max - min)) * usable
      : pad + ((v - min) / (max - min)) * usable;

  // PanResponder se stvara jednom, pa najnovije vrijednosti čita iz ref-a
  const latest = useRef({});
  latest.current = {
    value, min, max, step, vertical, pad, usable, toPos, kettlebellSize,
    onChange, onDragStart, onDragEnd,
  };
  // Koliko je prst udaljen od središta kettlebella kad ga je uhvatio
  const grabOffset = useRef(0);
  // Položaj početka trake na ekranu, zapamćen kad povlačenje krene
  const trackOrigin = useRef(0);

  const responder = useMemo(() => {
    const pagePos = (event) =>
      latest.current.vertical ? event.nativeEvent.pageY : event.nativeEvent.pageX;
    // locationX/Y vrijede samo dok je prst iznad trake (kad izađe, Android ih računa
    // prema drugom elementu), pa se pri pomicanju računa iz koordinata ekrana
    const touchPos = (event) => pagePos(event) - trackOrigin.current;

    const moveTo = (pos) => {
      const s = latest.current;
      const ratio = clamp((pos - s.pad) / s.usable, 0, 1);
      const raw = s.vertical ? s.max - ratio * (s.max - s.min) : s.min + ratio * (s.max - s.min);
      const next = Number((Math.round((raw - s.min) / s.step) * s.step + s.min).toFixed(2));
      if (next !== s.value) s.onChange(next);
    };

    // Ako je dodir na samom kettlebellu (npr. na ručki), vuče se bez skoka;
    // dodir negdje drugdje na traci premjesti kettlebell na to mjesto
    const grab = (event) => {
      const s = latest.current;
      // Na početku je prst sigurno iznad trake, pa je location ovdje pouzdan
      const touch = s.vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX;
      trackOrigin.current = pagePos(event) - touch;
      const thumb = s.toPos(clamp(s.value, s.min, s.max));
      const kb = s.kettlebellSize;
      const before = s.vertical ? kb * BODY_CENTER : kb / 2;
      const after = s.vertical ? kb * (KETTLEBELL_HEIGHT - BODY_CENTER) : kb / 2;
      const onThumb = touch >= thumb - before && touch <= thumb + after;
      grabOffset.current = onThumb ? touch - thumb : 0;
      s.onDragStart?.();
      moveTo(touch - grabOffset.current);
    };
    const drag = (event) => moveTo(touchPos(event) - grabOffset.current);
    const end = () => latest.current.onDragEnd?.();

    return PanResponder.create({
      // Okomitu traku hvatamo odmah (dodir skoči na vrijednost),
      // vodoravnu tek kad je pokret vodoravan, da okomito skrolanje ekrana i dalje radi
      onStartShouldSetPanResponder: () => latest.current.vertical,
      onMoveShouldSetPanResponder: (_, g) =>
        latest.current.vertical
          ? Math.abs(g.dy) > Math.abs(g.dx)
          : Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: grab,
      onPanResponderMove: drag,
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, []);

  const ticks = useMemo(
    () =>
      range(min, max, minorEvery).map((v) => ({
        v,
        major: (v - min) % majorEvery === 0,
        label: (v - min) % labelEvery === 0,
      })),
    [min, max, minorEvery, majorEvery, labelEvery]
  );

  const current = clamp(value, min, max);
  const pos = toPos(current);
  const kbCenter = kettlebellSize * BODY_CENTER;

  const stepBy = (dir) => {
    const next = Number(clamp(current + dir * step, min, max).toFixed(2));
    if (next !== current) onChange(next);
  };
  const a11y = {
    accessible: true,
    accessibilityRole: 'adjustable',
    // Android traži cijele brojeve (80.5 baca "Loss of precision"), točnu vrijednost nosi text
    accessibilityValue: {
      min: Math.round(min),
      max: Math.round(max),
      now: Math.round(current),
      text: formatValue(current),
    },
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    onAccessibilityAction: (e) => stepBy(e.nativeEvent.actionName === 'increment' ? 1 : -1),
  };

  const kettlebell = <Kettlebell label={formatValue(current)} size={kettlebellSize} />;

  if (vertical) {
    const labelWidth = 34;
    const trackX = labelWidth + 28; // središte trake
    const trackLeft = trackX - trackThickness / 2;

    return (
      <View
        collapsable={false}
        style={{ width: trackX + kettlebellSize / 2 + 4, height: length }}
        {...responder.panHandlers}
        {...a11y}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {ticks.map(({ v, major, label }) => {
            const y = toPos(v);
            const tickLength = major ? 18 : 9;
            return (
              <Fragment key={v}>
                <View
                  style={[
                    styles.tick,
                    { left: trackLeft - 2 - tickLength, top: y - 1, width: tickLength, height: 2 },
                  ]}
                />
                {label && (
                  <Text style={[styles.tickLabel, styles.vLabel, { top: y - 8, width: labelWidth }]}>
                    {v}
                  </Text>
                )}
              </Fragment>
            );
          })}
          <View
            style={[styles.track, { left: trackLeft, top: pad, width: trackThickness, height: usable }]}
          />
          <View
            style={[
              styles.fill,
              { left: trackLeft, top: pos, width: trackThickness, height: pad + usable - pos },
            ]}
          />
          <View style={[styles.thumb, { left: trackX - kettlebellSize / 2, top: pos - kbCenter }]}>
            {kettlebell}
          </View>
        </View>
      </View>
    );
  }

  const trackTop = kbCenter - trackThickness / 2; // traka prolazi kroz središte kettlebella
  const ticksTop = trackTop + trackThickness + 3;

  return (
    <View
      collapsable={false}
      style={{ height: ticksTop + 30 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...responder.panHandlers}
      {...a11y}
    >
      {width > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {ticks.map(({ v, major, label }) => {
            const x = toPos(v);
            return (
              <Fragment key={v}>
                <View
                  style={[styles.tick, { left: x - 1, top: ticksTop, width: 2, height: major ? 12 : 6 }]}
                />
                {label && (
                  <Text style={[styles.tickLabel, styles.hLabel, { left: x - 20, top: ticksTop + 14 }]}>
                    {v}
                  </Text>
                )}
              </Fragment>
            );
          })}
          <View
            style={[
              styles.track,
              {
                left: pad,
                top: trackTop,
                width: usable,
                height: trackThickness,
                borderRadius: trackThickness / 2,
              },
            ]}
          />
          <View
            style={[
              styles.fill,
              {
                left: pad,
                top: trackTop,
                width: pos - pad,
                height: trackThickness,
                borderRadius: trackThickness / 2,
              },
            ]}
          />
          <View style={[styles.thumb, { left: pos - kettlebellSize / 2, top: 0 }]}>
            {kettlebell}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ rotate: '-30deg' }],
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
  },
  thumb: {
    position: 'absolute',
  },
  track: {
    position: 'absolute',
    backgroundColor: TRACK_BG,
    borderRadius: 4,
  },
  fill: {
    position: 'absolute',
    backgroundColor: ORANGE,
    borderRadius: 4,
  },
  tick: {
    position: 'absolute',
    backgroundColor: '#9a8f8a',
    borderRadius: 1,
  },
  tickLabel: {
    position: 'absolute',
    fontSize: 11,
    color: '#65617e',
  },
  vLabel: {
    left: 0,
    height: 16,
    textAlign: 'right',
  },
  hLabel: {
    width: 40,
    textAlign: 'center',
  },
});

export default KettlebellSlider;
