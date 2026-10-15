import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Zafrkancija za prijatelje: "Pro verzija" u stilu Super Saiyan Goda.
// Ništa se ne naplaćuje: gumb za kupnju samo skupi ki i otkrije šalu.

// Boje plave aure i žute aureole, kao na slici Vegete
export const SSB_AZURE = '#1fb5ff';
const GOLD = '#fdf082';
const GOLD_DEEP = '#f5b82e';
const NAVY = '#050d2b';
const ICE = '#e6f7ff';
const FLASH = '#d8f4ff';

// Vegeta s bočno proširenom pozadinom (scripts/super-saiyan-bg.js): original je u
// sredini, a strane su zamućeni nastavak scene, pa slika ispuni širinu kartice
const VEGETA = require('../assets/images/vegeta_pro_wide.jpg');
const WIDE_RATIO = 1126 / 1024; // širina / visina proširene slike
const FIGURE_RATIO = 572 / 1024; // širina / visina originala (Vegeta od aureole do čizama)
// Tamnoplavi prijelaz (PNG): gore proziran, dolje pun; slika ispod čizama prelazi u tekst
const SCRIM = require('../assets/images/ssg_scrim.png');
const SCRIM_HEIGHT = 16;
// Procjena visine teksta dok se ne izmjeri
const TEXT_ESTIMATE = 300;

const FEATURES = [
  { icon: 'people', text: 'Praćenje prijatelja' },
  { icon: 'camera', text: 'Slikanje hrane' },
  { icon: 'mic', text: 'Trening slikom ili govorom' },
];

// Uvod (ms): aureola se upali žuto, prijeđe u plavo, pa eksplodira i pojavi se kartica
const HALO_IN_MS = 800;
const HALO_BLUE_MS = 900;
const HALO_BURST_MS = 1000;
const CHARGE_MS = 2200;
const RING_COUNT = 3;
const PARTICLE_COUNT = 14;

// Vibracija; tiho se preskače ako je uređaj ne podržava
const buzz = (style) => Haptics.impactAsync(style).catch(() => {});

// Azurni gumb koji otvara zafrkanciju (mikrofon na Strong Boy, kamera na Big man)
export const SuperSaiyanButton = ({ icon, label, onPress, style }) => (
  <TouchableOpacity style={[styles.ssbButton, style]} onPress={onPress} accessibilityLabel={label}>
    <Ionicons name={icon} size={24} color={NAVY} />
  </TouchableOpacity>
);

// Aureola: krug spljošten u elipsu, s mekim sjajem oko prstena
const Halo = ({ size, color, glowColor, opacity, scale }) => (
  <Animated.View
    style={{
      position: 'absolute',
      width: size,
      height: size,
      opacity,
      transform: [{ scale }, { scaleY: 0.4 }],
    }}
  >
    <View
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: size / 2, borderWidth: 24, borderColor: glowColor, opacity: 0.35 },
      ]}
    />
    <View
      style={[
        StyleSheet.absoluteFill,
        { margin: 8, borderRadius: size / 2, borderWidth: 9, borderColor: color },
      ]}
    />
  </Animated.View>
);

// Čestice kija koje se dižu oko Vegete; položaji (udio širine i visine slike) su
// nasumični pri svakom otvaranju
const makeParticles = () =>
  Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(),
    y: 0.3 + Math.random() * 0.6,
    size: 3 + Math.round(Math.random() * 3),
    duration: 1800 + Math.random() * 1600,
    delay: Math.random() * 1500,
    value: new Animated.Value(0),
  }));

// Sadržaj se montira tek kad se prozor otvori, pa svako otvaranje kreće ispočetka
const SuperSaiyanContent = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // 'offer' → 'charging' → 'reveal'
  const [phase, setPhase] = useState('offer');
  const [barWidth, setBarWidth] = useState(0);
  // Visina teksta ispod slike, izmjerena jednom (pa se slika ne mijenja kod šale)
  const [textHeight, setTextHeight] = useState(null);

  // Zaobljena kartica u sredini ekrana: gore slika preko cijele širine, ispod tekst.
  // Slika je visoka koliko stane iznad teksta, pa se Vegeta vidi cijeli, od aureole
  // do čizama, a tekst ga ne prekriva. Najviše toliko da Vegeta zauzme 90 % širine.
  const cardWidth = Math.min(width - 32, 400);
  const innerWidth = cardWidth - 3; // bez ruba kartice
  const available = height - insets.top - insets.bottom - 32;
  const imageHeight = Math.round(
    Math.max(
      200,
      Math.min(available - (textHeight ?? TEXT_ESTIMATE), (0.9 * innerWidth) / FIGURE_RATIO)
    )
  );
  const imageWidth = Math.round(imageHeight * WIDE_RATIO);
  const cardHeight = imageHeight + (textHeight ?? TEXT_ESTIMATE) + 3;
  const haloSize = cardWidth * 0.75;
  const ringSize = innerWidth * 0.7;

  const backdropIn = useRef(new Animated.Value(0)).current;
  const haloIn = useRef(new Animated.Value(0)).current;
  const haloBlue = useRef(new Animated.Value(0)).current;
  const haloBurst = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const charge = useRef(new Animated.Value(0)).current;
  const revealIn = useRef(new Animated.Value(0)).current;
  const [rings] = useState(() => Array.from({ length: RING_COUNT }, () => new Animated.Value(0)));
  const [particles] = useState(makeParticles);
  const glowLoop = useRef(null);
  const tickTimer = useRef(null);
  const timers = useRef([]);
  const chargingRef = useRef(false);
  const mountedRef = useRef(true);

  // Prstenovi aure koji se šire iz Vegetinih prsa
  const burst = () => {
    Animated.stagger(
      160,
      rings.map((ring) => {
        ring.setValue(0);
        return Animated.timing(ring, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        });
      })
    ).start();
  };

  const flashOnce = () => {
    flash.setValue(0.6);
    Animated.timing(flash, { toValue: 0, duration: 650, useNativeDriver: true }).start();
  };

  // Aura pulsira: polako dok čeka, brzo dok se skuplja ki
  const pulse = (duration) => {
    glowLoop.current?.stop();
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    glowLoop.current.start();
  };

  // Uvod: tamna pozadina, žuta aureola koja prijeđe u plavu, pa eksplozija i kartica
  useEffect(() => {
    mountedRef.current = true;
    const later = (ms, action) => timers.current.push(setTimeout(action, ms));

    buzz(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(backdropIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(haloIn, {
          toValue: 1,
          duration: HALO_IN_MS,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(haloBlue, {
        toValue: 1,
        duration: HALO_BLUE_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(haloBurst, {
          toValue: 1,
          duration: HALO_BURST_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(cardIn, { toValue: 1, friction: 7, tension: 35, useNativeDriver: true }),
      ]),
    ]).start();

    later(HALO_IN_MS + HALO_BLUE_MS / 2, () => buzz(Haptics.ImpactFeedbackStyle.Medium));
    later(HALO_IN_MS + HALO_BLUE_MS, () => {
      buzz(Haptics.ImpactFeedbackStyle.Heavy);
      flashOnce();
      burst();
      pulse(1200);
    });

    const floating = particles.map((particle) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(particle.delay),
          Animated.timing(particle.value, {
            toValue: 1,
            duration: particle.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      )
    );
    floating.forEach((animation) => animation.start());

    return () => {
      mountedRef.current = false;
      timers.current.forEach(clearTimeout);
      glowLoop.current?.stop();
      floating.forEach((animation) => animation.stop());
      charge.stopAnimation();
      clearInterval(tickTimer.current);
    };
  }, []);

  // "Kupnja": ki se skuplja uz vibraciju, pa Vegeta otkrije šalu
  const startCharging = () => {
    // Brzi dvostruki dodir ne smije pokrenuti dva punjenja
    if (chargingRef.current) return;
    chargingRef.current = true;
    setPhase('charging');
    pulse(260);
    burst();
    tickTimer.current = setInterval(() => buzz(Haptics.ImpactFeedbackStyle.Light), 160);
    Animated.timing(charge, {
      toValue: 1,
      duration: CHARGE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      clearInterval(tickTimer.current);
      if (!finished || !mountedRef.current) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      flashOnce();
      burst();
      pulse(1200);
      setPhase('reveal');
      Animated.spring(revealIn, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    });
  };

  // Žuta aureola se gasi dok se pali plava, a plava nestaje u eksploziji
  const goldOpacity = Animated.multiply(haloIn, Animated.subtract(1, haloBlue));
  const blueOpacity = Animated.multiply(haloBlue, Animated.subtract(1, haloBurst));
  const haloScale = Animated.add(
    haloIn.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    haloBurst.interpolate({ inputRange: [0, 1], outputRange: [0, 2.4] })
  );
  const goldTint = Animated.multiply(goldOpacity, 0.14);
  const blueTint = Animated.multiply(blueOpacity, 0.14);

  const cardOpacity = cardIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const cardScale = cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const imageScale = cardIn.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1], extrapolate: 'clamp' });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.2] });
  const edgeOpacity = Animated.multiply(
    glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }),
    cardOpacity
  );
  const barX = charge.interpolate({ inputRange: [0, 1], outputRange: [-barWidth, 0] });
  const revealScale = revealIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropIn }]} />

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: GOLD, opacity: goldTint }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SSB_AZURE, opacity: blueTint }]} />
        <Halo size={haloSize} color={GOLD} glowColor={GOLD_DEEP} opacity={goldOpacity} scale={haloScale} />
        <Halo size={haloSize} color={ICE} glowColor={SSB_AZURE} opacity={blueOpacity} scale={haloScale} />
      </View>

      {/* Azurni sjaj oko kartice, pulsira s aurom */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardGlow,
          {
            width: cardWidth + 20,
            height: cardHeight + 20,
            opacity: edgeOpacity,
            transform: [{ scale: cardScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.card,
          { width: cardWidth, opacity: cardOpacity, transform: [{ scale: cardScale }] },
        ]}
      >
        <View style={[styles.imageArea, { height: imageHeight }]}>
          <Animated.Image
            source={VEGETA}
            style={{
              position: 'absolute',
              top: 0,
              left: (innerWidth - imageWidth) / 2,
              width: imageWidth,
              height: imageHeight,
              transform: [{ scale: imageScale }],
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.glow, { opacity: glowOpacity }]}
          />
          {rings.map((ring, index) => (
            <Animated.View
              key={index}
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  left: (innerWidth - ringSize) / 2,
                  top: imageHeight * 0.42 - ringSize / 2,
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
                  transform: [
                    { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) },
                  ],
                },
              ]}
            />
          ))}
          {particles.map((particle, index) => (
            <Animated.View
              key={index}
              pointerEvents="none"
              style={[
                styles.particle,
                {
                  left: particle.x * innerWidth,
                  top: particle.y * imageHeight,
                  width: particle.size,
                  height: particle.size,
                  borderRadius: particle.size / 2,
                  opacity: particle.value.interpolate({
                    inputRange: [0, 0.2, 0.8, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: particle.value.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -imageHeight * 0.45],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
          {/* Slika ispod čizama prelazi u tamnoplavu pozadinu teksta */}
          <Image source={SCRIM} resizeMode="stretch" style={styles.scrim} />
        </View>

        <View
          style={[styles.content, textHeight !== null && { minHeight: textHeight }]}
          onLayout={(event) => {
            if (textHeight === null) setTextHeight(Math.ceil(event.nativeEvent.layout.height));
          }}
        >
          {phase === 'reveal' ? (
            <Animated.View style={{ opacity: revealIn, transform: [{ scale: revealScale }] }}>
              <Text style={styles.badge}>VEGETA</Text>
              <Text style={styles.titleTop} numberOfLines={1} adjustsFontSizeToFit>
                Ha! Super Saiyan
              </Text>
              <Text style={styles.titleBig} numberOfLines={1} adjustsFontSizeToFit>
                se ne kupuje!
              </Text>
              <Text style={styles.revealText}>Postaje se treningom. Verzija 2 stiže uskoro.</Text>
              <TouchableOpacity style={styles.buy} onPress={onClose}>
                <Text style={styles.buyText}>Natrag na trening</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.badge}>SUPER SAIYAN GOD</Text>
              <Text style={styles.titleTop} numberOfLines={1} adjustsFontSizeToFit>
                Jesi li spreman postati
              </Text>
              <Text style={styles.titleBig} numberOfLines={1} adjustsFontSizeToFit>
                Super Saiyan?
              </Text>
              <View style={styles.features}>
                {FEATURES.map((feature) => (
                  <View key={feature.text} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={feature.icon} size={15} color={NAVY} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>

              {phase === 'charging' ? (
                <View
                  style={styles.bar}
                  onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
                >
                  {/* Punjenje se crta tek kad je širina trake poznata */}
                  {barWidth > 0 && (
                    <Animated.View style={[styles.barFill, { transform: [{ translateX: barX }] }]} />
                  )}
                  <Text style={styles.barText}>Skupljam ki…</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.buy} onPress={startCharging}>
                  <Text style={styles.buyText}>Postani Super Saiyan · 14,99 $</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Zatvori">
          <Ionicons name="close" size={20} color={ICE} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]}
      />
    </View>
  );
};

const SuperSaiyanModal = ({ visible, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="none"
    statusBarTranslucent
    navigationBarTranslucent
    onRequestClose={onClose}
  >
    {visible && <SuperSaiyanContent onClose={onClose} />}
  </Modal>
);

const glowText = (radius) => ({
  textShadowColor: SSB_AZURE,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: radius,
});

// Tamna sjena da se svijetli tekst čita i preko svijetlih dijelova slike
const darkShadow = {
  textShadowColor: 'rgba(0, 0, 0, 0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

const styles = StyleSheet.create({
  ssbButton: {
    width: 50,
    marginLeft: 8,
    backgroundColor: SSB_AZURE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(2, 6, 22, 0.9)',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    backgroundColor: FLASH,
  },
  cardGlow: {
    position: 'absolute',
    borderRadius: 36,
    backgroundColor: SSB_AZURE,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: SSB_AZURE,
    backgroundColor: NAVY,
    overflow: 'hidden',
  },
  glow: {
    backgroundColor: SSB_AZURE,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: SSB_AZURE,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#c9f2ff',
  },
  imageArea: {
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: SCRIM_HEIGHT,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 247, 255, 0.6)',
    backgroundColor: 'rgba(5, 13, 43, 0.7)',
  },
  badge: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: SSB_AZURE,
    ...glowText(6),
  },
  titleTop: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    ...darkShadow,
  },
  titleBig: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    ...glowText(16),
  },
  features: {
    alignSelf: 'center',
    marginTop: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SSB_AZURE,
  },
  featureText: {
    fontSize: 15,
    color: ICE,
    marginLeft: 10,
    ...darkShadow,
  },
  revealText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    color: ICE,
    ...darkShadow,
  },
  buy: {
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: SSB_AZURE,
    elevation: 8,
  },
  buyText: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
  },
  bar: {
    height: 52,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: SSB_AZURE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 181, 255, 0.12)',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    backgroundColor: SSB_AZURE,
  },
  barText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: NAVY,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});

export default SuperSaiyanModal;
