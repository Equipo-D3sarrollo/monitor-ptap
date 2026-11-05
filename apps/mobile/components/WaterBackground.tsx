import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Colors from '../constants/colors';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { WAVE_PERIOD, wavePath } from './wave-path';
import { phaseRange } from './loop-phase';

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
  { color: L.waveBack, periods: 1, amp: 21, lift: 18, ms: 14_000, reverse: false },
  { color: L.waveMid, periods: 2, amp: 18, lift: 8, ms: 10_000, reverse: true },
  { color: L.waveFront, periods: 3, amp: 13, lift: 0, ms: 7_000, reverse: false },
].map(l => ({ ...l, d: wavePath(l.periods * 2, l.amp) }));

/**
 * Burbujas: posición horizontal (%), diámetro, duración de la subida y `phase` = en qué punto de su
 * recorrido arranca (fracción). Fase en vez de retraso: ver loop-phase.ts.
 */
const BUBBLES = [
  { left: 12, size: 6, ms: 5200, phase: 0 },
  { left: 28, size: 4, ms: 6800, phase: 0.45 },
  { left: 44, size: 8, ms: 7600, phase: 0.2 },
  { left: 63, size: 5, ms: 5800, phase: 0.7 },
  { left: 79, size: 7, ms: 6400, phase: 0.35 },
  { left: 91, size: 5, ms: 6000, phase: 0.85 },
];

interface Props {
  /** Fracción del alto (0–1) que cubre el agua cuando termina de subir. */
  level: number;
  /**
   * Agua quieta, como con "reducir movimiento". El tablero lo usa cuando la planta no está en
   * línea: un agua en movimiento sobre una planta sin datos aparentaría una vida que no hay.
   */
  paused?: boolean;
}

/**
 * Fondo de agua: sube desde abajo al montar ("el tanque se llena") y queda con 3 capas de olas en
 * bucle y burbujas. Ocupa todo su contenedor (que debe tener `overflow: 'hidden'`) y no recibe
 * toques. Con "reducir movimiento" activo el agua aparece ya llena y quieta.
 */
export function WaterBackground({ level, paused = false }: Props) {
  const reduceMotion = useReduceMotion();
  const reduce = reduceMotion === null ? null : reduceMotion || paused;
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
    // Bucle de un solo `timing`, sin `Animated.delay` dentro: `loop(sequence([delay, timing]))` no
    // reinicia el valor tras la primera vuelta y todo se quedaba quieto a los pocos segundos.
    const linear = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: NATIVE }),
      );
    const anims = [
      Animated.timing(rise, {
        toValue: 1,
        duration: RISE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }),
      ...LAYERS.map((l, i) => linear(drift[i], l.ms)),
      ...BUBBLES.map((b, i) => linear(bubbles[i], b.ms)),
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
          BUBBLES.map((b, i) => {
            const p = bubbles[i].interpolate(phaseRange(b.phase));
            return (
              <Animated.View
                key={b.left}
                style={[
                  styles.bubble,
                  {
                    left: `${b.left}%`,
                    width: b.size,
                    height: b.size,
                    borderRadius: b.size / 2,
                    opacity: p.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.55, 0.35, 0] }),
                    transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -(h - waterTop) * 0.9] }) }],
                  },
                ]}
              />
            );
          })}
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
