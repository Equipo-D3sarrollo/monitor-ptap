import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from './AppIcon';
import { Fonts } from '../constants/fonts';
import { estilosConTema, useTheme } from '../context/ThemeContext';
import { motivoBloqueo, type GroupId } from '../services/signal-groups';

/**
 * Encabezado de un grupo de señales (Entrada / Salida / Proceso).
 *
 * **Grupo siempre abierto:** si el grupo trae algo fuera de rango, sin dato, o la planta está
 * congelada, `lockedOpen` es true y el encabezado deja de ser pulsable. Una anomalía no puede
 * quedar detrás de un gesto en un tablero de planta — la agrupación es para dar jerarquía, no para
 * esconder. Cuando está bloqueado se dice por qué, con el ícono del MOTIVO (advertencia, sin dato,
 * reloj) y no un candado, que se leía como «sin permiso».
 *
 * Recibe PRIMITIVAS, no el objeto grupo: los grupos se reconstruyen en cada push de ~2 s, así que
 * pasar el objeto dejaría el `memo` sin efecto.
 */
function GroupHeaderBase({
  id,
  title,
  count,
  anomalyCount,
  noDataCount,
  lockedOpen,
  collapsed,
  onToggle,
}: {
  id: GroupId;
  title: string;
  count: number;
  anomalyCount: number;
  noDataCount: number;
  lockedOpen: boolean;
  collapsed: boolean;
  onToggle: (id: GroupId) => void;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const bloqueo = motivoBloqueo(anomalyCount, noDataCount);
  const motivo = bloqueo.texto;
  const colorBloqueo = bloqueo.tono === 'critico' ? t.criticoTexto : t.antTextoSec;

  const body = (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.countPill}>
        <Text style={styles.countText}>{count}</Text>
      </View>

      {anomalyCount > 0 && (
        <View style={styles.alertPill}>
          <Ionicons name="alert-circle" size={12} color={t.critico} />
          <Text style={styles.alertText}>{anomalyCount}</Text>
        </View>
      )}

      <View style={styles.spacer} />

      {lockedOpen ? (
        <View style={styles.lockRow}>
          <Ionicons name={bloqueo.icon} size={13} color={colorBloqueo} />
          <Text style={[styles.lockText, { color: colorBloqueo }]}>{motivo}</Text>
        </View>
      ) : (
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={t.antTextoSec}
        />
      )}
    </View>
  );

  if (lockedOpen) {
    return (
      <View
        style={styles.header}
        accessibilityRole="header"
        accessibilityLabel={`${title}, ${count} señales. No se puede plegar: ${motivo}.`}
      >
        {body}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.header}
      onPress={() => onToggle(id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={`${title}, ${count} señales. ${collapsed ? 'Desplegar' : 'Plegar'}.`}
    >
      {body}
    </TouchableOpacity>
  );
}

export const GroupHeader = memo(GroupHeaderBase);

const useStyles = estilosConTema((t) => ({
  header: { paddingHorizontal: 5, paddingVertical: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: Fonts.semibold, fontSize: 13, color: t.antTexto, letterSpacing: 0.3 },
  countPill: {
    backgroundColor: t.antSuperficiePagina,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: t.antTextoSec,
    fontVariant: ['tabular-nums'],
  },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: t.critico + '18',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  alertText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: t.criticoTexto,
    fontVariant: ['tabular-nums'],
  },
  spacer: { flex: 1 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText: { fontFamily: Fonts.regular, fontSize: 12 },
}));
