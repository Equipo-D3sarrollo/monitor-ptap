import { hasRangeAnomaly, type SignalDto } from '@ptap/shared';
import Colors from '../constants/colors';
import { directionFor } from './signal-kind';

const B = Colors.brand;

/**
 * Reglas de presentación de las tarjetas del tablero, aparte de los componentes para poder
 * probarlas sin React Native.
 */

/** Rojo SOLO para fuera de rango. Mismo criterio que la campana (`hasRangeAnomaly` de @ptap/shared):
 *  incluye el rango OPERATIVO (opMin/opMax), no solo el `outOfRange` físico del backend. */
export function isAnomalous(signal: SignalDto): boolean {
  return hasRangeAnomaly(signal);
}

export interface DirectionLook {
  label: 'Entrada' | 'Salida';
  /** Nombre de Ionicons. */
  icon: 'arrow-forward' | 'arrow-back';
  color: string;
}

/** Entrada y salida se distinguen con icono + etiqueta + dos azules. El verde queda para "OK". */
export function directionLook(domainKey: string): DirectionLook | null {
  const d = directionFor(domainKey);
  if (d === 'inlet') return { label: 'Entrada', icon: 'arrow-forward', color: B.inflow };
  if (d === 'outlet') return { label: 'Salida', icon: 'arrow-back', color: B.outflow };
  return null;
}

export type TankFillKind = 'unconfirmed' | 'normal' | 'overflow';

export interface TankFill {
  kind: TankFillKind;
  /** Altura del agua dibujada, 0–100. null = no se dibuja nivel (no se inventa). */
  drawPct: number | null;
}

/**
 * Cómo dibujar el tanque. `percentage` null = la planta no ha confirmado la capacidad: no hay
 * nivel que dibujar. Por encima de 100 % es rebose: se dibuja lleno y se dice que rebosa.
 */
export function tankFill(percentage: number | null): TankFill {
  if (percentage === null || !Number.isFinite(percentage)) return { kind: 'unconfirmed', drawPct: null };
  if (percentage > 100) return { kind: 'overflow', drawPct: 100 };
  return { kind: 'normal', drawPct: Math.max(0, percentage) };
}

/**
 * ¿Destellar la tarjeta? Solo cuando el valor de verdad cambió respecto al último pintado, la
 * planta no está congelada y no se pidió reducir movimiento. El número nunca se anima.
 */
export function shouldFlash(
  previous: unknown,
  next: unknown,
  frozen: boolean,
  reduceMotion: boolean | null,
): boolean {
  return previous !== undefined && previous !== next && !frozen && reduceMotion === false;
}
