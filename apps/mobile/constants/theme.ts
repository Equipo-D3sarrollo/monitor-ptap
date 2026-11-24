import Colors from './colors';

/**
 * Paletas de Aquora por TOKEN SEMÁNTICO (qué es, no qué color es).
 *
 * - `oscuro` es la identidad de siempre: cada valor es EXACTAMENTE el que ya usaba el tablero
 *   (`Colors.brand` y los hex sueltos de las tarjetas). Cambiar de tema no puede mover un píxel
 *   del oscuro; lo comprueba `theme.test.ts`.
 * - `claro` es «papel técnico»: fondo gris muy claro (nunca blanco puro), tarjetas blancas con
 *   borde y sombra sutil, y los mismos acentos de marca. Contrastes medidos (WCAG 2.x): texto
 *   ≥ 4,5:1, iconos y bordes que comunican estado ≥ 3:1; también lo comprueba el test.
 *
 * Regla: todo token que se use como color es `#RRGGBB`, porque varias pantallas añaden
 * transparencia concatenando (`color + '18'`). Las únicas excepciones son `velo` y `destello`,
 * que siempre se usan tal cual como fondo.
 *
 * Los estados nunca van solo por color: el rojo, el ámbar y el gris de integración siempre van con
 * ícono + texto. Eso importa sobre todo en el claro, donde `alerta` (#8A6500) es un ámbar oscuro
 * que sin ícono se confundiría con texto normal.
 */
export interface Paleta {
  fondo: string;
  panel: string;
  superficie: string;
  fila: string;
  seleccionado: string;
  pulsado: string;
  bordeTarjeta: string;
  bordeSuave: string;
  /** Borde de las filas de la lista de plantas. */
  bordeFila: string;
  bordeHoja: string;
  bordeControl: string;
  divisor: string;
  texto: string;
  textoSec: string;
  placeholder: string;
  accion: string;
  accionPresionada: string;
  sobreAccion: string;
  enlace: string;
  marca: string;
  marcaVerde: string;
  marcaAmarillo: string;
  entrada: string;
  salida: string;
  enVivo: string;
  alerta: string;
  critico: string;
  criticoTexto: string;
  bannerFondo: string;
  bannerTexto: string;
  integracion: string;
  foco: string;
  agua: string;
  /** Línea de la superficie del agua del tanque (D2): da el borde que el relleno solo no da. */
  aguaSuperficie: string;
  velo: string;
  destello: string;
  /** Destello más suave para el tanque, que ya tiene mucho color propio. */
  destelloTanque: string;
}

export type NombreTema = 'oscuro' | 'claro';

const B = Colors.brand;

export const TEMAS: Record<NombreTema, Paleta> = {
  oscuro: {
    fondo: B.page,
    panel: B.panel,
    superficie: B.card,
    fila: B.row,
    seleccionado: B.selected,
    pulsado: '#0E2536',
    bordeTarjeta: '#1B3044',
    bordeSuave: B.cardBorder,
    bordeFila: B.rowBorder,
    bordeHoja: '#1E3A52',
    bordeControl: B.searchBorder,
    divisor: B.divider,
    texto: B.text,
    textoSec: B.textSecondary,
    placeholder: B.placeholder,
    accion: B.action,
    accionPresionada: B.actionPressed,
    sobreAccion: B.white,
    enlace: B.link,
    marca: B.blue,
    marcaVerde: B.green,
    marcaAmarillo: B.yellow,
    entrada: B.inflow,
    salida: B.outflow,
    enVivo: B.green,
    alerta: B.yellow,
    critico: Colors.danger,
    criticoTexto: B.dangerText,
    bannerFondo: '#2A1416',
    bannerTexto: '#E6C9C9',
    integracion: B.gray,
    foco: B.blue,
    agua: Colors.login.waveMid,
    aguaSuperficie: B.blue,
    velo: 'rgba(2,8,14,0.7)',
    destello: 'rgba(36,145,204,0.2)',
    destelloTanque: 'rgba(36,145,204,0.12)',
  },
  claro: {
    fondo: '#F2F5F7',
    panel: '#E8EDF1',
    superficie: '#FFFFFF',
    fila: '#F8FAFB',
    seleccionado: '#DCEAF5',
    pulsado: '#EAF1F7',
    bordeTarjeta: '#C5D0DA',
    bordeSuave: '#D3DBE2',
    bordeFila: '#D3DBE2',
    bordeHoja: '#C5D0DA',
    bordeControl: '#6F8394',
    divisor: '#DCE3E9',
    texto: '#0E1C28',
    textoSec: '#475867',
    placeholder: '#56677A',
    accion: '#1C6FA0',
    accionPresionada: '#175A84',
    sobreAccion: '#FFFFFF',
    enlace: '#0F5F8F',
    marca: '#2491CC',
    marcaVerde: '#88BD4C',
    marcaAmarillo: '#F3CB35',
    entrada: '#0A6EA6',
    salida: '#17496F',
    enVivo: '#3B7514',
    alerta: '#8A6500',
    critico: '#D32F2F',
    criticoTexto: '#B3261E',
    bannerFondo: '#FDECEC',
    bannerTexto: '#7F1D1D',
    integracion: '#626A71',
    foco: '#0B6AA2',
    agua: '#12608F',
    aguaSuperficie: '#2491CC',
    velo: 'rgba(14,28,40,0.45)',
    destello: 'rgba(36,145,204,0.16)',
    destelloTanque: 'rgba(36,145,204,0.1)',
  },
};
