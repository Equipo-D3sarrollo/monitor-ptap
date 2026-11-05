import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Colors from '../constants/colors';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { phaseRange } from './loop-phase';

// En web, Animated no tiene driver nativo y avisa si se le pide: allí corre en JS.
const NATIVE = Platform.OS !== 'web';
const LOGO_RATIO = 459 / 545; // alto / ancho de assets/aquora-logo.png
const FLOAT_PX = 8;
const FLOAT_MS = 6000;
const RING_MS = 4500;
/** 3 anillos desfasados 1/3 de vuelta = uno nuevo cada 1,5 s. */
const RINGS = [0, 1, 2];

interface Props {
  /** Ancho del logo en px. */
  width: number;
}

/**
 * Logo de Aquora que flota (±8 px, 6 s) y emite 3 anillos azules que crecen de 0,55 a 1,9 y se
 * desvanecen (4,5 s, desfasados 1,5 s). Con "reducir movimiento" queda el logo quieto, sin anillos.
 */
export function LogoRipples({ width }: Props) {
  const reduce = useReduceMotion();
  const float = useRef(new Animated.Value(0)).current;
  // Un solo bucle para los 3 anillos; cada uno es ese bucle con otra fase (ver loop-phase.ts). Con
  // un retraso por anillo, el escalonado dependía de temporizadores separados y se desalineaba.
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce !== false) return;
    const half = (toValue: number) =>
      Animated.timing(float, {
        toValue,
        duration: FLOAT_MS / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: NATIVE,
      });
    const anims = [
      Animated.loop(Animated.sequence([half(1), half(0)])),
      Animated.loop(
        Animated.timing(ring, { toValue: 1, duration: RING_MS, easing: Easing.linear, useNativeDriver: NATIVE }),
      ),
    ];
    anims.forEach(a => a.start());
    return () => {
      anims.forEach(a => a.stop());
      float.setValue(0);
      ring.setValue(0);
    };
  }, [reduce, float, ring]);

  const height = width * LOGO_RATIO;
  const ringSize = width * 0.95;

  return (
    <View style={[styles.box, { width, height }]}>
      {reduce === false &&
        RINGS.map(i => {
          const p = ring.interpolate(phaseRange(i / RINGS.length));
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  // Como la referencia (aqRipple, ease-out): nace a 0,55 de escala y opacidad y se
                  // desvanece a lo largo de TODA la vuelta, así los 3 anillos se ven a la vez.
                  opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                  transform: [
                    { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.9], easing: Easing.out(Easing.quad) }) },
                  ],
                },
              ]}
            />
          );
        })}
      <Animated.Image
        source={require('../assets/aquora-logo.png')}
        style={{
          width,
          height,
          transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [-FLOAT_PX, FLOAT_PX] }) }],
        }}
        resizeMode="contain"
        accessibilityLabel="Aquora, creado por Xpertic"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2, borderColor: Colors.login.brandBlue },
});
