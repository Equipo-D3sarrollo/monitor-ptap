import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLAVE_TEMA, leerPreferencia, type PreferenciaTema } from './theme-prefs';

/** Guardado de la preferencia de tema: localStorage en web, AsyncStorage en Android. */

/**
 * Web: lectura SÍNCRONA, para que el primer render ya salga con el tema correcto (sin parpadeo).
 * Android no tiene almacenamiento síncrono: devuelve undefined y se usa `cargarPreferencia`.
 */
export function preferenciaSincrona(plataforma: string): PreferenciaTema | undefined {
  if (plataforma !== 'web') return undefined;
  try {
    return leerPreferencia(globalThis.localStorage?.getItem(CLAVE_TEMA), plataforma);
  } catch {
    return 'oscuro';
  }
}

export async function cargarPreferencia(plataforma: string): Promise<PreferenciaTema> {
  const sync = preferenciaSincrona(plataforma);
  if (sync) return sync;
  try {
    return leerPreferencia(await AsyncStorage.getItem(CLAVE_TEMA), plataforma);
  } catch {
    return 'oscuro';
  }
}

export async function guardarPreferencia(pref: PreferenciaTema, plataforma: string): Promise<void> {
  try {
    if (plataforma === 'web') globalThis.localStorage?.setItem(CLAVE_TEMA, pref);
    else await AsyncStorage.setItem(CLAVE_TEMA, pref);
  } catch {
    // Sin almacenamiento (modo privado, cuota): el tema vale para esta sesión y ya.
  }
}
