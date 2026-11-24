import { memo } from 'react';
import { View, Text } from 'react-native';
import Colors from '../constants/colors';
import type { Paleta } from '../constants/theme';
import { estilosConTema, useTheme } from '../context/ThemeContext';
import type { LivenessState } from '../services/api';
import { livenessBadge } from '../services/plant-status';

/**
 * Badge de frescura REAL (ya no cosmético). Tres estados y solo UNO es una alarma:
 *   verde  EN VIVO   → los valores se están moviendo.
 *   azul   ESTABLE   → la sesión está sana y el proceso quieto. Normal, NO es un fallo:
 *                      un tanque a nivel constante se ve así durante horas.
 *   rojo   CONGELADO → perdimos la conexión con el PLC; lo que se muestre ya no es fiable.
 * Y dos neutros (gris), que no son alarmas:
 *   CONECTANDO…      → carga inicial, aún sin dato: no se alarma con el rojo antes de tiempo.
 *   EN INTEGRACIÓN   → la planta aún no está conectada al PLC maestro (`integrationPending`): su
 *                      `frozen` no es una caída. Ver `services/plant-status.ts`.
 * El punto de color siempre va con el texto: el estado nunca se dice solo con el color.
 */

/**
 * `livenessBadge` (plant-status.ts, compartido con Electroválvulas y la vista Civil) devuelve los
 * colores de la paleta anterior. Aquí se traducen al tema: en oscuro son los mismos; en claro, sus
 * equivalentes con contraste ≥ 3:1 sobre la barra blanca.
 */
function colorDelTema(color: string, t: Paleta): string {
  if (color === Colors.success) return t.antExito;
  if (color === Colors.primaryLight) return t.antPrimarioClaro;
  if (color === Colors.danger) return t.antPeligro;
  if (color === Colors.neutral) return t.antNeutro;
  return color;
}

function LiveBadgeBase({
  state,
  loading = false,
  integrationPending = false,
}: {
  state: LivenessState;
  loading?: boolean;
  integrationPending?: boolean;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const { color, label } = livenessBadge(state, { loading, integrationPending });
  return (
    <View
      // El paso a CONGELADO es información crítica que hoy solo se veía. `polite` hace que un
      // lector de pantalla lo anuncie al cambiar, sin interrumpir lo que esté leyendo.
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      accessibilityLabel={`Estado de los datos: ${label}`}
      style={styles.barra}
    >
      <View style={[styles.punto, { backgroundColor: colorDelTema(color, t) }]} />
      <Text style={styles.texto}>{label}</Text>
    </View>
  );
}

const useStyles = estilosConTema((t) => ({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: t.antSuperficie,
    borderTopWidth: 1,
    borderTopColor: t.antDivisor,
  },
  punto: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  texto: { fontSize: 12, fontWeight: '600', color: t.antTextoSec, letterSpacing: 1.2 },
}));

/** Props primitivas (incluida `integrationPending`): el `memo` de fábrica basta. */
export const LiveBadge = memo(LiveBadgeBase);
