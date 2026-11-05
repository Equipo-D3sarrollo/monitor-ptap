import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { shouldFlash } from '../services/card-look';
import { useReduceMotion } from './useReduceMotion';

const NATIVE = Platform.OS !== 'web';

/**
 * Opacidad (0–1) de un destello breve cuando `value` cambia. Para una capa encima de la tarjeta:
 * el número cambia de golpe, lo que se anima es solo el resplandor de la tarjeta. Sin destello si
 * la planta está congelada o la persona pidió reducir movimiento.
 */
export function useValueFlash(value: unknown, frozen: boolean): Animated.Value {
  const reduce = useReduceMotion();
  const flash = useRef(new Animated.Value(0)).current;
  const last = useRef<unknown>(undefined);

  useEffect(() => {
    const previous = last.current;
    last.current = value;
    if (!shouldFlash(previous, value, frozen, reduce)) return;
    const anim = Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
      Animated.timing(flash, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: NATIVE }),
    ]);
    anim.start();
    // Si se corta a medias (otro cambio, desmontaje), no dejar la tarjeta iluminada.
    return () => {
      anim.stop();
      flash.setValue(0);
    };
  }, [value, frozen, reduce, flash]);

  return flash;
}
