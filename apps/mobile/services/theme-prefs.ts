import type { NombreTema } from '../constants/theme';

/**
 * Preferencia de tema guardada EN EL DISPOSITIVO (no en la cuenta): es una cuestión de pantalla y
 * de luz ambiente, y un mismo usuario puede querer el claro en la laptop y el oscuro en el teléfono.
 *
 * El oscuro es el predeterminado: es la identidad de Aquora y lo que ve quien nunca tocó el botón.
 *
 * ── «Según el sistema» en Android: PENDIENTE DEL PRÓXIMO APK ──────────────────────────────────
 * Hoy `app.json` fija `"userInterfaceStyle": "dark"`, y con eso Android le dice siempre «oscuro» a
 * `useColorScheme()`, así que en Android solo se ofrecen Oscuro y Claro. Para habilitarlo en la
 * próxima APK (no llega por OTA: es configuración nativa):
 *   1. `app.json` → `"userInterfaceStyle": "automatic"`.
 *   2. `npx expo install expo-system-ui` (sin él Android ignora `userInterfaceStyle`) y fijar el
 *      fondo raíz con `SystemUI.setBackgroundColorAsync` según el tema, para que no se vea un
 *      fondo blanco al rotar o al volver de segundo plano.
 *   3. Splash: plugin `expo-splash-screen` con `backgroundColor` oscuro (y `dark` igual), y
 *      `preventAutoHideAsync()` + `hide()` cuando `ThemeProvider` haya leído la preferencia.
 *   4. Subir `android.versionCode`.
 *   5. Quitar el filtro de plataforma de `opcionesDeTema` y su test.
 */
export type PreferenciaTema = NombreTema | 'sistema';

export const CLAVE_TEMA = 'aquora.tema';

/** Lo que se ofrece en el selector. `web` = el navegador, que sí sigue al sistema operativo. */
export function opcionesDeTema(plataforma: string): { id: PreferenciaTema; etiqueta: string }[] {
  const base: { id: PreferenciaTema; etiqueta: string }[] = [
    { id: 'oscuro', etiqueta: 'Oscuro' },
    { id: 'claro', etiqueta: 'Claro' },
  ];
  return plataforma === 'web' ? [...base, { id: 'sistema', etiqueta: 'Según el sistema' }] : base;
}

/** Valor guardado → preferencia válida. Cualquier otra cosa (o nada) es el oscuro de siempre. */
export function leerPreferencia(raw: string | null | undefined, plataforma: string): PreferenciaTema {
  if (raw === 'claro' || raw === 'oscuro') return raw;
  if (raw === 'sistema' && plataforma === 'web') return 'sistema';
  return 'oscuro';
}

/** Tema que se PINTA. `esquema` es lo que dice `useColorScheme()` (o null si no lo sabe). */
export function resolverTema(
  pref: PreferenciaTema,
  esquema: string | null | undefined,
): NombreTema {
  if (pref === 'sistema') return esquema === 'light' ? 'claro' : 'oscuro';
  return pref;
}

/** El botón de la barra alterna entre los dos temas a partir del que se está viendo. */
export function temaAlterno(actual: NombreTema): NombreTema {
  return actual === 'oscuro' ? 'claro' : 'oscuro';
}
