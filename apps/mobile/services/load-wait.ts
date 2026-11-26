/**
 * Cuánto se espera la primera lectura antes de decir que la planta no responde.
 *
 * Sin este límite, si la primera consulta se quedaba colgada el tablero mostraba las cajas vacías
 * del esqueleto para siempre: `useSnapshot` solo reintenta cuando hay ERROR, no cuando la respuesta
 * simplemente no llega. 15 s es más que una carga en frío normal y lo bastante corto para que el
 * operador no se quede mirando cajas grises sin saber qué pasa.
 */
export const ESPERA_MAXIMA_MS = 15_000;

export type EstadoEspera = 'consultando' | 'sin_respuesta';
