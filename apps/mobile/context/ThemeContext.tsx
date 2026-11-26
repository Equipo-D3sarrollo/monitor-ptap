import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Platform,
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type PressableStateCallbackType,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { TEMAS, type NombreTema, type Paleta } from '../constants/theme';
import { resolverTema, temaAlterno, type PreferenciaTema } from '../services/theme-prefs';
import { cargarPreferencia, guardarPreferencia, preferenciaSincrona } from '../services/theme-storage';

interface TemaContexto {
  /** Colores del tema que se está pintando. */
  t: Paleta;
  nombre: NombreTema;
  preferencia: PreferenciaTema;
  setPreferencia: (p: PreferenciaTema) => void;
  /** Botón de la barra: pasa al otro tema (y deja de seguir al sistema, si lo hacía). */
  alternar: () => void;
}

/** Fuera del proveedor (tests, pantallas sueltas) todo sigue siendo el oscuro de siempre. */
const OSCURO: TemaContexto = {
  t: TEMAS.oscuro,
  nombre: 'oscuro',
  preferencia: 'oscuro',
  setPreferencia: () => {},
  alternar: () => {},
};

const Contexto = createContext<TemaContexto>(OSCURO);

/**
 * Tema de la app. Va en la raíz, por encima de todo.
 *
 * - Web: la preferencia se lee de `localStorage` de forma SÍNCRONA en el primer render, así que la
 *   app nunca pinta un tema y luego el otro. (El HTML de producción además fija el fondo antes de
 *   que cargue el JS: ver tools/web/prepare-production.cjs.)
 * - Android: AsyncStorage es asíncrono. Hasta leerla no se pinta nada (unos milisegundos): así quien
 *   eligió el claro no ve un fotograma oscuro de la app. Para atar esto al splash nativo hace falta
 *   `expo-splash-screen` en la próxima APK (ver services/theme-prefs.ts).
 *
 * El contexto cambia SOLO al cambiar de tema, nunca con los datos de la planta: es el uso que
 * React Native recomienda para un contexto (tema, sesión, idioma).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferencia, setPref] = useState<PreferenciaTema | undefined>(() =>
    preferenciaSincrona(Platform.OS),
  );
  const esquema = useColorScheme();

  useEffect(() => {
    if (preferencia !== undefined) return;
    let vivo = true;
    void cargarPreferencia(Platform.OS).then((p) => {
      if (vivo) setPref(p);
    });
    return () => {
      vivo = false;
    };
  }, [preferencia]);

  const nombre = resolverTema(preferencia ?? 'oscuro', esquema);

  const setPreferencia = useCallback((p: PreferenciaTema) => {
    setPref(p);
    void guardarPreferencia(p, Platform.OS);
  }, []);
  const alternar = useCallback(
    () => setPreferencia(temaAlterno(nombre)),
    [nombre, setPreferencia],
  );

  // Web: el fondo del documento y la barra del navegador siguen al tema (también tras alternar).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const fondo = TEMAS[nombre].fondo;
    document.documentElement.style.backgroundColor = fondo;
    document.documentElement.style.colorScheme = nombre === 'claro' ? 'light' : 'dark';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', fondo);
  }, [nombre]);

  const valor = useMemo<TemaContexto>(
    () => ({
      t: TEMAS[nombre],
      nombre,
      preferencia: preferencia ?? 'oscuro',
      setPreferencia,
      alternar,
    }),
    [nombre, preferencia, setPreferencia, alternar],
  );

  if (preferencia === undefined) return null;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTheme(): TemaContexto {
  return useContext(Contexto);
}

/**
 * Hoja de estilos que depende del tema, calculada UNA vez por tema y compartida por todas las
 * instancias del componente: en el tablero hay decenas de tarjetas que se re-renderizan con cada
 * snapshot (~2 s), y crear un `StyleSheet` en cada render sería tirar trabajo.
 *
 *   const useStyles = estilosConTema((t, nombre) => ({ card: { backgroundColor: t.superficie } }));
 *   function Tarjeta() { const s = useStyles(); … }
 */
type Estilos = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function estilosConTema<T extends Estilos>(
  crear: (t: Paleta, nombre: NombreTema) => T,
): () => T {
  const cache: Partial<Record<NombreTema, T>> = {};
  return function useEstilos() {
    const { nombre } = useTheme();
    return (cache[nombre] ??= StyleSheet.create(crear(TEMAS[nombre], nombre)));
  };
}

/**
 * Sombra de las tarjetas: solo en el claro (en el oscuro el borde ya separa, y una sombra negra
 * sobre azul noche no se ve). Web usa `boxShadow`; Android, `elevation`.
 */
export function sombraTarjeta(nombre: NombreTema): ViewStyle {
  if (nombre === 'oscuro') return {};
  return (
    Platform.select<ViewStyle>({
      web: { boxShadow: '0 1px 2px rgba(14,28,40,0.06), 0 1px 3px rgba(14,28,40,0.08)' },
      default: {
        elevation: 1,
        shadowColor: '#0E1C28',
        shadowOpacity: 0.08,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
    }) ?? {}
  );
}

/**
 * Anillo de foco visible en web (2 px del color de foco, separado 2 px). En Android no aplica: el
 * foco de teclado lo dibuja el sistema y la navegación táctil no tiene foco visible.
 */
export function anilloFoco(t: Paleta): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return { outlineColor: t.foco, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } as ViewStyle;
}

/**
 * ¿El `Pressable` tiene el foco DE TECLADO? react-native-web marca `focused` también al hacer clic,
 * así que se pregunta al navegador si el elemento activo cumple `:focus-visible` (la misma regla
 * con la que el navegador decide su propio anillo: Tab sí, clic no). En Android, false.
 */
export function enfocado(estado: PressableStateCallbackType): boolean {
  if ((estado as PressableStateCallbackType & { focused?: boolean }).focused !== true) return false;
  try {
    return globalThis.document?.activeElement?.matches(':focus-visible') === true;
  } catch {
    return false; // navegador sin :focus-visible: sin anillo propio, queda el del sistema
  }
}
