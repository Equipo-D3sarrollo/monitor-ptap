import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Colors from '../constants/colors';
import { useReduceMotion } from '../hooks/useReduceMotion';

// En web, Animated no tiene driver nativo y avisa si se le pide: allí corre en JS.
const NATIVE = Platform.OS !== 'web';
const LOGO_RATIO = 459 / 545; // alto / ancho de assets/aquora-logo.png
const FLOAT_PX = 8;
const FLOAT_MS = 6000;
const RING_MS = 4500;
const RING_GAP_MS = 1500;
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
  const rings = useRef(RINGS.map(() => new Animated.Value(0))).current;

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
      // El desfase va FUERA del bucle: dentro se repetiría en cada vuelta y rompería el ritmo.
      ...rings.map((v, i) =>
        Animated.sequence([
          Animated.delay(i * RING_GAP_MS),
          Animated.loop(
            Animated.timing(v, { toValue: 1, duration: RING_MS, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
          ),
        ]),
      ),
    ];
    anims.forEach(a => a.start());
    return () => {
      anims.forEach(a => a.stop());
      float.setValue(0);
      rings.forEach(v => v.setValue(0));
    };
  }, [reduce, float, rings]);

  const height = width * LOGO_RATIO;
  const ring = width * 0.95;

  return (
    <View style={[styles.box, { width, height }]}>
      {reduce === false &&
        rings.map((v, i) => (
          <Animated.View
            key={RINGS[i]}
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: ring,
                height: ring,
                borderRadius: ring / 2,
                opacity: v.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.6, 0] }),
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.9] }) }],
              },
            ]}
          />
        ))}
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
