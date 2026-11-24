import type { PlantListItem } from '@ptap/shared';
import type { PlantOption } from '../context/PlantContext';
import { plantStatus, type PlantStatus } from './plant-status';

export type PlantFilter = 'todas' | 'linea' | 'sin';

export const PLANT_FILTERS: { id: PlantFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'linea', label: 'En línea' },
  { id: 'sin', label: 'Sin conexión' },
];

/**
 * Estado de una planta EN LA LISTA. Es el de `plantStatus` más un caso propio de la lista: la planta
 * en integración. Vive aquí y no en `plant-status.ts` porque ese módulo lo comparten el tablero,
 * Electroválvulas y la vista Civil, que ya tratan la integración por su cuenta.
 */
export type PickerStatus =
  | PlantStatus
  | {
      kind: 'integration';
      tone: 'muted';
      label: string;
      icon: 'construct-outline';
      online: false;
    };

/**
 * Planta dada de alta en el mapping que aún no está conectada al PLC maestro (`integrationPending`
 * de `GET /api/plants`). Su liveness es `frozen` desde el arranque, y sin este caso la lista decía
 * «Sin datos» y la contaba en «Sin conexión»: se leía como una caída, igual que contradecía al
 * tablero, que ya dice «Planta en integración».
 */
export const EN_INTEGRACION_LISTA: PickerStatus = {
  kind: 'integration',
  tone: 'muted',
  label: 'En integración',
  icon: 'construct-outline',
  online: false,
};

export interface PickerRow {
  plant: PlantOption;
  /** null = el servidor no ha informado esta planta (cargando, error o ausente): no se inventa estado. */
  status: PickerStatus | null;
}

/** Minúsculas y sin tildes: "pichinde" encuentra "Pichindé". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Une el catálogo de plantas con el estado en vivo de `GET /api/plants`, en el orden del catálogo. */
export function pickerRows(
  plants: PlantOption[],
  live: PlantListItem[] | undefined,
  now: Date = new Date(),
): PickerRow[] {
  const byId = new Map((live ?? []).map((p) => [p.plantId, p]));
  return plants.map((plant) => {
    const item = byId.get(plant.id);
    if (!item) return { plant, status: null };
    if (item.integrationPending) return { plant, status: EN_INTEGRACION_LISTA };
    return { plant, status: plantStatus(item.liveness, item.bridgeStatus, now) };
  });
}

/**
 * Búsqueda por nombre + filtro por estado. Una planta sin estado conocido, o en integración, solo
 * aparece en "Todas": no consta ni como "En línea" ni como "Sin conexión" (no se ha caído nada).
 */
export function filterRows(rows: PickerRow[], query: string, filter: PlantFilter): PickerRow[] {
  const q = normalize(query);
  return rows.filter(({ plant, status }) => {
    if (q && !normalize(plant.name).includes(q)) return false;
    if (filter === 'linea') return status?.online === true;
    if (filter === 'sin') return status?.online === false && status.kind !== 'integration';
    return true;
  });
}
