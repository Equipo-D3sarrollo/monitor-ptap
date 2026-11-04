import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Colors from '../constants/colors';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { WAVE_PERIOD, wavePath } from './wave-path';

const L = Colors.login;
// En web, Animated no tiene driver nativo y avisa si se le pide: allí corre en JS.
const NATIVE = Platform.OS !== 'web';
/** Alto en px de la franja SVG con la cresta de cada ola; debajo sigue agua lisa. */
const STRIP = 40;
const RISE_MS = 2200;

/**
 * Capas de atrás hacia adelante. `periods` = olas por cada ancho de pantalla; el SVG mide el doble
 * y se desplaza un ancho completo por vuelta, así el bucle coincide consigo mismo (ver wave-path).
 */
const LAYERS = [
  { color: L.waveBack, periods: 1, amp: 16, lift: 18, ms: 26_000, reverse: false },
  { color: L.waveMid, periods: 2, amp: 14, lift: 8, ms: 17_000, reverse: true },
  { color: L.waveFront, periods: 3, amp: 10, lift: 0, ms: 11_000, reverse: false },
].map(l => ({ ...l, d: wavePath(l.periods * 2, l.amp) }));

/** Burbujas: posición horizontal (%), diámetro, duración de la subida y desfase inicial. */
const BUBBLES = [
  { left: 12, size: 6, ms: 5200, delay: 0 },
  { left: 28, size: 4, ms: 6800, delay: 1400 },
  { left: 47, size: 8, ms: 7600, delay: 600 },
  { left: 63, size: 5, ms: 5800, delay: 2600 },
  { left: 81, size: 7, ms: 6400, delay: 1900 },
];

interface Props {
  /** Fracción del alto (0–1) que cubre el agua cuando termina de subir. */
  level: number;
}

/**
 * Fondo de agua: sube desde abajo al montar ("el tanque se llena") y queda con 3 capas de olas en
 * bucle y burbujas. Ocupa todo su contenedor (que debe tener `overflow: 'hidden'`) y no recibe
 * toques. Con "reducir movimiento" activo el agua aparece ya llena y quieta.
 */
export function WaterBackground({ level }: Props) {
  const reduce = useReduceMotion();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const rise = useRef(new Animated.Value(0)).current;
  const drift = useRef(LAYERS.map(() => new Animated.Value(0))).current;
  const bubbles = useRef(BUBBLES.map(() => new Animated.Value(0))).current;
  const ready = size !== null && reduce !== null;

  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      rise.setValue(1);
      return;
    }
    const linear = (v: Animated.Value, ms: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: NATIVE }),
        ]),
      );
    const anims = [
      Animated.timing(rise, {
        toValue: 1,
        duration: RISE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }),
      ...LAYERS.map((l, i) => linear(drift[i], l.ms)),
      ...BUBBLES.map((b, i) => linear(bubbles[i], b.ms, b.delay)),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [ready, reduce, rise, drift, bubbles]);

  function onLayout(e: LayoutChangeEvent) {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize(prev => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }

  if (!ready) return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout} />;

  const { w, h } = size;
  const waterTop = h * (1 - level);
  const fullHeight = h - waterTop + STRIP;

  return (
    <View style={styles.root} pointerEvents="none" onLayout={onLayout}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [fullHeight, 0] }) }] },
        ]}
      >
        {LAYERS.map((l, i) => (
          <Animated.View
            key={l.color}
            style={[
              styles.layer,
              {
                top: waterTop - STRIP / 2 - l.lift,
                width: w * 2,
                transform: [
                  {
                    translateX: drift[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: l.reverse ? [-w, 0] : [0, -w],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg
              width={w * 2}
              height={STRIP}
              viewBox={`0 0 ${l.periods * 2 * WAVE_PERIOD} 100`}
              preserveAspectRatio="none"
            >
              <Path d={l.d} fill={l.color} />
            </Svg>
            {/* -1 px de solape: evita una línea de fondo entre la franja SVG y el agua lisa. */}
            <View style={[styles.body, { backgroundColor: l.color }]} />
          </Animated.View>
        ))}

        {!reduce &&
          BUBBLES.map((b, i) => (
            <Animated.View
              key={b.left}
              style={[
                styles.bubble,
                {
                  left: `${b.left}%`,
                  width: b.size,
                  height: b.size,
                  borderRadius: b.size / 2,
                  opacity: bubbles[i].interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.55, 0.35, 0] }),
                  transform: [
                    {
                      translateY: bubbles[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -(h - waterTop) * 0.9],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, bottom: 0 },
  body: { flex: 1, marginTop: -1 },
  bubble: { position: 'absolute', bottom: 8, backgroundColor: 'rgba(242,247,250,0.9)' },
});
