import { classifyBridge, type BridgeStatus, type LivenessDto } from '@ptap/shared';

/** Estado de una planta para el semáforo del tablero. El color nunca va solo: siempre con icono y texto. */
export type PlantStatusKind = 'live' | 'stable' | 'frozen' | 'no_link' | 'no_plc_data';
/** Sin `danger`: el rojo queda SOLO para valores fuera de rango, nunca para el estado de la planta. */
export type PlantStatusTone = 'ok' | 'muted';

export interface PlantStatus {
  kind: PlantStatusKind;
  tone: PlantStatusTone;
  label: string;
  /** Nombre de Ionicons. */
  icon: 'radio' | 'checkmark-circle' | 'time-outline' | 'cloud-offline-outline';
  /** true si la planta cuenta como "En línea" para el filtro del selector. */
  online: boolean;
}

/** "14:05" si es de hoy; "03/11 14:05" si es de otro día. Hora local del dispositivo. */
export function formatSince(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? hhmm : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hhmm}`;
}

/**
 * Semáforo según el dominio (no por intuición):
 * - Puente distinto de `Connected` manda sobre la frescura: sin enlace no hay dato fiable.
 *   "Sin conexión" va en gris con icono de desconexión, igual cuando la ruta al PLC cayó como
 *   cuando el PLC no entrega datos (`classifyBridge` los distingue en `kind`). El rojo es solo
 *   para valores fuera de rango.
 * - `live` y `stable` son operación NORMAL → verde. `stable` nunca es advertencia.
 * - `frozen` → gris con reloj y la hora del último cambio conocido: distinto de "Sin conexión".
 */
export function plantStatus(liveness: LivenessDto, bridgeStatus: BridgeStatus, now: Date = new Date()): PlantStatus {
  const bridge = classifyBridge(bridgeStatus);
  if (bridge === 'route') {
    return { kind: 'no_link', tone: 'muted', label: 'Sin conexión', icon: 'cloud-offline-outline', online: false };
  }
  if (bridge === 'master_no_data') {
    return { kind: 'no_plc_data', tone: 'muted', label: 'Sin conexión', icon: 'cloud-offline-outline', online: false };
  }
  switch (liveness.state) {
    case 'live':
      return { kind: 'live', tone: 'ok', label: 'En vivo', icon: 'radio', online: true };
    case 'stable':
      return { kind: 'stable', tone: 'ok', label: 'Estable', icon: 'checkmark-circle', online: true };
    case 'frozen':
      return {
        kind: 'frozen',
        tone: 'muted',
        label: liveness.lastChangeAt ? `Sin datos desde ${formatSince(liveness.lastChangeAt, now)}` : 'Sin datos',
        icon: 'time-outline',
        online: false,
      };
  }
}
