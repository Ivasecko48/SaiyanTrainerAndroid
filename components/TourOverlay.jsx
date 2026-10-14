import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  PixelRatio,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTour } from '@/contexts/TourContext';
import { TOUR_STEPS } from '@/utils/tourSteps';
import NimbusBubble, { CloudPuff } from './NimbusBubble';

const PAD = 6; // razmak oko istaknutog elementa
const HOLE_RADIUS = 14; // zaobljenje osvijetljenog dijela
const EDGE = 8; // najmanji razmak oblaka od ruba ekrana
const MAX_WIDTH = 400;
const TRAIL = 54; // prostor između elementa i oblaka, u njemu je trag malih oblačića
const OVERLAP = 16; // okvir oblaka malo ulazi u trag (puhovi ne idu do ruba okvira)
const DIM = 'rgba(0,0,0,0.62)';
const ORANGE = '#fc7138';

// Trag od elementa do oblaka: sve veći oblačići (at = udaljenost od ruba elementa)
const TRAIL_PUFFS = [
  { at: 6, size: 10 },
  { at: 22, size: 15 },
  { at: 45, size: 21 },
];

const measure = (node) =>
  new Promise((resolve) => {
    if (!node?.measureInWindow) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

// Pričekaj da JS završi s crtanjem novog ekrana (najviše ~0,6 s)
const idle = () =>
  new Promise((resolve) => {
    try {
      requestIdleCallback(() => resolve(), { timeout: 600 });
    } catch {
      setTimeout(resolve, 250);
    }
  });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const px = (value) => PixelRatio.roundToNearestPixel(value);

/**
 * Gdje ide oblak i odakle izlazi (sve u koordinatama overlaya):
 * ispod ili iznad elementa s tragom malih oblačića, a ako je element prevelik,
 * preko njega na stranu gdje ima više mjesta. Bez elementa: sredina ekrana.
 */
const placeBubble = (hole, height, W, H, insets) => {
  const width = Math.min(W - EDGE * 2, MAX_WIDTH);
  const minTop = insets.top + EDGE;
  const maxBottom = H - insets.bottom - EDGE;
  const lowestTop = Math.max(minTop, maxBottom - height); // oblak skroz dolje

  if (!hole) {
    return {
      left: (W - width) / 2,
      top: clamp((H - height) / 2, minTop, lowestTop),
      dx: 0,
      dy: 0,
      trail: [],
    };
  }

  const cx = hole.x + hole.width / 2;
  const cy = hole.y + hole.height / 2;
  const left = clamp(cx - width / 2, EDGE, W - EDGE - width);
  const below = hole.y + hole.height;
  const gap = TRAIL - OVERLAP;

  let top;
  let direction = 0; // 1 = trag ide prema dolje, -1 = prema gore, 0 = bez traga
  if (maxBottom - below - gap >= height) {
    top = below + gap;
    direction = 1;
  } else if (hole.y - gap - minTop >= height) {
    top = hole.y - gap - height;
    direction = -1;
  } else {
    top = maxBottom - below > hole.y - minTop ? lowestTop : minTop;
  }

  // Trag kreće s ruba elementa i lagano skreće prema sredini oblaka
  const startX = clamp(cx, 26, W - 26);
  const startY = direction === 1 ? below : hole.y;
  const drift = clamp((left + width / 2 - startX) * 0.3, -26, 26);
  const trail = direction
    ? TRAIL_PUFFS.map(({ at, size }) => ({
        size,
        left: startX + drift * (at / TRAIL) - size / 2,
        top: startY + direction * at - size / 2,
      }))
    : [];

  return {
    left,
    top,
    // oblak kreće iz sredine elementa
    dx: cx - (left + width / 2),
    dy: cy - (top + height / 2),
    trail,
  };
};

// Zatamnjenje s "rupom" zaobljenih kutova oko elementa i žutim obrubom
const Spotlight = ({ hole, ring }) => {
  const box = { top: hole.y, left: hole.x, width: hole.width, height: hole.height };
  return (
    <>
      <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hole.y) }]} />
      <View style={[styles.dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.dim, { top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.height }]} />
      <View style={[styles.dim, { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height }]} />
      {/* kutovi rupe: debeli zatamnjeni obrub odrezan na veličinu rupe */}
      <View style={[styles.corners, box]}>
        <View style={styles.cornersFrame} />
      </View>
      <Animated.View style={[styles.ring, box, ring]} />
    </>
  );
};

/**
 * Vodič kroz aplikaciju preko cijelog ekrana: zatamnjenje s osvijetljenim elementom
 * i Flying Nimbus oblak koji izlazi iz tog elementa (trag malih oblačića vodi do njega).
 * Renderira se zadnji u TabLayoutu, iznad tabova i zaglavlja.
 * Sve animacije idu preko nativnog drivera, pa ne zapinju dok se novi ekran crta.
 */
const TourOverlay = () => {
  const tour = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const rootRef = useRef(null);
  const size = useRef(null);
  const busy = useRef(false); // dok oblak odlazi ili se novi traži, gumbi ne rade
  // prikazani korak: { index, hole, place }; place je null dok se ne izmjeri visina oblaka
  const [shown, setShown] = useState(null);

  const curtain = useRef(new Animated.Value(0)).current; // cijeli vodič
  const pop = useRef(new Animated.Value(0)).current; // oblak i žuti obrub
  const puffs = useRef(TRAIL_PUFFS.map(() => new Animated.Value(0))).current;

  const active = tour?.active;
  const step = tour?.step;
  const place = shown?.place;

  const screen = () => size.current || Dimensions.get('window');

  // Element koraka koji je stvarno na ekranu, u koordinatama overlaya (s razmakom)
  const findTarget = async (id) => {
    const origin = await measure(rootRef.current);
    if (!origin) return null;
    const { width: W, height: H } = screen();

    for (const node of tour.getTargets(id)) {
      const m = await measure(node);
      if (!m || m.width <= 0 || m.height <= 0) continue;
      const x = m.x - origin.x;
      const y = m.y - origin.y;
      if (x + m.width > 0 && x < W && y + m.height > 0 && y < H) {
        return {
          x: px(x - PAD),
          y: px(y - PAD),
          width: px(m.width + PAD * 2),
          height: px(m.height + PAD * 2),
        };
      }
    }
    return null;
  };

  // Početak i kraj vodiča: zatamnjenje se lagano pojavi
  useEffect(() => {
    pop.setValue(0);
    puffs.forEach((value) => value.setValue(0));
    busy.current = false;
    if (!active) return;
    curtain.setValue(0);
    Animated.timing(curtain, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [active]);

  // Novi korak: po potrebi prebaci tab, pronađi element, pa pokaži oblak
  useEffect(() => {
    if (!active || !step) {
      setShown(null);
      return undefined;
    }
    let cancelled = false;
    const changesScreen = !pathname.includes(step.screen);
    if (changesScreen) {
      setShown(null); // dok se novi ekran crta, samo zatamnjenje
      router.navigate(`/(screens)/${step.screen}`);
    }

    const show = async () => {
      if (changesScreen) await idle();
      let hole = null;
      // element se prijavi tek kad se ekran prvi put nacrta, pa se traži do ~2 s
      for (let attempt = 0; step.target && !hole && attempt < 20; attempt++) {
        await (attempt === 0 ? nextFrame() : wait(100));
        if (cancelled) return;
        hole = await findTarget(step.target);
      }
      if (!step.target) await nextFrame();
      if (cancelled) return;
      pop.setValue(0);
      setShown({ index: tour.index, hole, place: null });
    };

    show();
    return () => {
      cancelled = true;
    };
  }, [active, tour?.index]);

  // Oblak je izmjeren i postavljen: izleti iz elementa, a za njim trag oblačića
  useEffect(() => {
    if (!place) return undefined;
    pop.setValue(0);
    puffs.forEach((value) => value.setValue(0));
    const animation = Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 8, tension: 85, useNativeDriver: true }),
      Animated.stagger(
        80,
        puffs.map((value) =>
          Animated.spring(value, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true })
        )
      ),
    ]);
    animation.start();
    busy.current = false;
    return () => animation.stop();
  }, [place]);

  const bubbleMotion = useMemo(() => {
    const dx = place?.dx ?? 0;
    const dy = place?.dy ?? 0;
    return {
      opacity: pop.interpolate({ inputRange: [0, 0.35], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [
        { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
        { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
        { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }) },
      ],
    };
  }, [place]);

  const ringMotion = useMemo(
    () => ({
      opacity: pop.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [
        { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1], extrapolate: 'clamp' }) },
      ],
    }),
    []
  );

  const puffMotion = useMemo(
    () =>
      puffs.map((value) => ({
        opacity: value.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
      })),
    []
  );

  if (!active || !step) return null;

  const bubbleWidth = Math.min(screen().width - EDGE * 2, MAX_WIDTH);
  const shownStep = shown ? TOUR_STEPS[shown.index] : null;
  const last = shown?.index === TOUR_STEPS.length - 1;

  // Visina oblaka je poznata tek nakon prvog crtanja (nevidljivo), pa se tad postavi
  const onBubbleLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    setShown((current) => {
      if (!current || current.place) return current;
      const { width: W, height: H } = screen();
      return { ...current, place: placeBubble(current.hole, height, W, H, insets) };
    });
  };

  // Oblak se vrati u element, pa tek onda ide sljedeći korak
  const leave = (then, closing = false) => {
    if (busy.current) return;
    busy.current = true;
    const animations = [
      Animated.timing(pop, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      ...puffs.map((value) =>
        Animated.timing(value, { toValue: 0, duration: 140, useNativeDriver: true })
      ),
    ];
    if (closing) {
      animations.push(Animated.timing(curtain, { toValue: 0, duration: 240, useNativeDriver: true }));
    }
    Animated.parallel(animations).start(() => then());
  };

  const handleNext = () => (last ? leave(tour.finish, true) : leave(tour.next));
  const handleBack = () => leave(tour.back);
  const handleSkip = () => leave(tour.finish, true);

  return (
    <Animated.View
      ref={rootRef}
      collapsable={false}
      style={[styles.root, { opacity: curtain }]}
      onLayout={(e) => {
        size.current = e.nativeEvent.layout;
      }}
      // dok traje vodič, dodiri ne prolaze do aplikacije ispod
      onStartShouldSetResponder={() => true}
    >
      {shown?.hole ? (
        <Spotlight hole={shown.hole} ring={ringMotion} />
      ) : (
        <View style={[styles.dim, FILL_PARENT]} />
      )}

      {place?.trail.map((puff, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[styles.puff, { left: puff.left, top: puff.top }, puffMotion[i]]}
        >
          <CloudPuff size={puff.size} />
        </Animated.View>
      ))}

      {shownStep && (
        <Animated.View
          key={shown.index}
          pointerEvents={place ? 'box-none' : 'none'}
          onLayout={place ? undefined : onBubbleLayout}
          style={[
            styles.bubble,
            { width: bubbleWidth, left: place ? place.left : EDGE, top: place ? place.top : 0 },
            bubbleMotion,
          ]}
        >
          <NimbusBubble variant={shown.index}>
            <Text style={styles.counter}>
              {shown.index + 1}/{TOUR_STEPS.length}
            </Text>
            <Text style={styles.title}>{shownStep.title}</Text>
            <Text style={styles.text}>{shownStep.text}</Text>
            <View style={styles.buttons}>
              {!last && (
                <Pressable onPress={handleSkip} hitSlop={8}>
                  <Text style={styles.skip}>Preskoči</Text>
                </Pressable>
              )}
              <View style={styles.spacer} />
              {shown.index > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                  onPress={handleBack}
                  hitSlop={6}
                >
                  <Feather name="chevron-left" size={16} color="#5b3d00" />
                  <Text style={styles.backText}>Natrag</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
                onPress={handleNext}
              >
                <Text style={styles.nextText}>{last ? 'Kreni!' : 'Dalje'}</Text>
                {!last && <Feather name="chevron-right" size={16} color="#fff" />}
              </Pressable>
            </View>
          </NimbusBubble>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// RN 0.86 više nema StyleSheet.absoluteFillObject (spread bi tiho dodao ništa),
// pa je "preko cijelog roditelja" napisano izričito
const FILL_PARENT = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

const styles = StyleSheet.create({
  root: {
    ...FILL_PARENT,
    zIndex: 1000,
    elevation: 20,
  },
  dim: {
    position: 'absolute',
    backgroundColor: DIM,
  },
  corners: {
    position: 'absolute',
    overflow: 'hidden',
  },
  cornersFrame: {
    position: 'absolute',
    top: -HOLE_RADIUS,
    left: -HOLE_RADIUS,
    right: -HOLE_RADIUS,
    bottom: -HOLE_RADIUS,
    borderWidth: HOLE_RADIUS,
    borderRadius: HOLE_RADIUS * 2,
    borderColor: DIM,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#ffe27a',
    borderRadius: HOLE_RADIUS,
  },
  puff: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
  },
  counter: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#a87400',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a2f00',
    marginTop: 2,
  },
  text: {
    fontSize: 14,
    color: '#5b3d00',
    lineHeight: 20,
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  skip: {
    fontSize: 13,
    color: '#8a6a1f',
    textDecorationLine: 'underline',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  backText: {
    fontSize: 14,
    color: '#5b3d00',
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: ORANGE,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nextText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
});

export default TourOverlay;
