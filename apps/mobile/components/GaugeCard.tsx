import { memo } from 'react';
import { View, Text, Animated } from 'react-native';
import Ionicons from './AppIcon';
import { Fonts } from '../constants/fonts';
import { estilosConTema, sombraTarjeta, useTheme } from '../context/ThemeContext';
import type { SignalDto, UnusableReason } from '../services/api';
import { directionLook, isAnomalous, signalState } from '../services/card-look';
import { useStateFlash } from '../hooks/useStateFlash';
import { sameSignalCard } from './memo-compare';
import { BotonSilencio } from './BotonSilencio';
import { formatUnit } from '../services/units';


const REASON_TEXT: Record<UnusableReason, string> = {
  BAD_QUALITY: 'calidad OPC no buena',
  INVALID_NUMBER: 'valor inválido',
  BRIDGE_STALE: 'sin datos frescos',
};

/** Formato numérico es-CO (coma decimal + separador de miles), coherente con el reloj del tablero. */
const fmt = (n: number, d = 2): string =>
  n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Tarjeta simple de una señal de dominio (caudal, presión, pH, turbidez, temperatura, oxígeno,
 * conductividad, cloro, o una digital on/off). Política de datos (usuario, 2026-07-15): si hay
 * valor SE MUESTRA tal cual; "sin dato" solo cuando value es null (no fabricar números).
 *
 * - Fuera de rango (físico u OPERATIVO, `hasRangeAnomaly`) → borde y valor en rojo. Es el único rojo.
 * - Entrada/salida → icono + etiqueta + su azul. Sin dirección → texto normal.
 * - Congelada → atenuada y con etiqueta. El número nunca se anima: al cambiar, la tarjeta destella.
 */
function GaugeCardBase({
  signal,
  name,
  icon,
  frozen = false,
  compact = false,
  plantId,
}: {
  signal: SignalDto;
  name: string;
  icon: string;
  frozen?: boolean;
  /**
   * Planta a la que pertenece la señal. Solo para la campana de silencio: el silenciado es por
   * planta Y señal, porque `outletFlow1` existe en las doce.
   */
  plantId?: string;
  /** Tablero en modo compacto: oculta la fila Mín/Máx, que es la que más ruido aporta por tarjeta. */
  compact?: boolean;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const numeric = typeof signal.value === 'number';
  const isBool = typeof signal.value === 'boolean';
  const hasMin = typeof signal.opMin === 'number';
  const hasMax = typeof signal.opMax === 'number';
  const anomaly = isAnomalous(signal);
  const dir = directionLook(name);
  // card-look da el azul de la paleta oscura; la tarjeta usa el del tema.
  const dirColor = dir ? (dir.label === 'Entrada' ? t.entrada : t.salida) : null;
  const accent = dirColor ?? t.texto;
  const flash = useStateFlash(signalState(signal), frozen);
  const label = signal.label ?? name;

  return (
    <View style={[styles.card, anomaly && styles.cardAnomaly, frozen && styles.cardFrozen]}>
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
      <View style={styles.top}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as never} size={18} color={accent} />
        </View>
        <View style={styles.flex} />
        {plantId ? <BotonSilencio plantId={plantId} subject={name} etiqueta={label} /> : null}
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {label}
      </Text>
      {dir && (
        <View style={styles.dirRow}>
          <Ionicons name={dir.icon} size={12} color={dirColor ?? undefined} />
          <Text style={[styles.dirText, { color: dirColor ?? undefined }]}>{dir.label}</Text>
        </View>
      )}

      {numeric ? (
        <Text
          style={[styles.value, { color: anomaly ? t.criticoTexto : accent }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {fmt(signal.value as number)}
          <Text style={styles.unit}> {formatUnit(signal.unit)}</Text>
        </Text>
      ) : isBool ? (
        <Text
          style={[styles.value, { color: (signal.value as boolean) ? t.enVivo : t.textoSec }]}
        >
          {(signal.value as boolean) ? 'Encendido' : 'Apagado'}
        </Text>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataValue}>sin dato</Text>
          {signal.reason && (
            <Text style={styles.noDataReason}>
              {REASON_TEXT[signal.reason] ?? 'sin dato utilizable'}
            </Text>
          )}
        </View>
      )}

      {(frozen || anomaly) && (
        <View style={styles.tagsRow}>
          {anomaly && (
            <View style={styles.tag}>
              <Ionicons name="alert-circle" size={13} color={t.critico} />
              <Text style={[styles.tagText, { color: t.criticoTexto }]}>Fuera de rango</Text>
            </View>
          )}
          {frozen && (
            <View style={styles.tag}>
              <Ionicons name="time-outline" size={13} color={t.integracion} />
              <Text style={styles.tagText}>Congelado</Text>
            </View>
          )}
        </View>
      )}

      {!compact && (hasMin || hasMax) && (
        <Text style={[styles.rangeText, anomaly && { color: t.criticoTexto }]}>
          {hasMin ? `Mín ${fmt(signal.opMin as number)}` : ''}
          {hasMin && hasMax ? '  ·  ' : ''}
          {hasMax ? `Máx ${fmt(signal.opMax as number)}` : ''}
        </Text>
      )}
    </View>
  );
}

/**
 * Memo con comparación POR VALOR: el snapshot se reconstruye entero cada ~2 s, así que la
 * comparación por referencia de `memo` no ahorraría ni un render. Ver `memo-compare.ts`.
 */
export const GaugeCard = memo(GaugeCardBase, sameSignalCard);

const useStyles = estilosConTema((t, nombre) => ({
  flex: { flex: 1 },
  card: {
    flex: 1,
    margin: 5,
    padding: 16,
    backgroundColor: t.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.bordeTarjeta,
    overflow: 'hidden',
    ...sombraTarjeta(nombre),
  },
  cardAnomaly: { borderColor: t.critico, borderWidth: 1.5 },
  cardFrozen: { borderStyle: 'dashed' },
  flash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: t.destello,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: t.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, color: t.textoSec },
  dirRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dirText: { fontFamily: Fonts.medium, fontSize: 12 },
  value: {
    fontFamily: Fonts.semibold,
    fontSize: 30,
    lineHeight: 38,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontFamily: Fonts.regular, fontSize: 14, color: t.textoSec },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontFamily: Fonts.medium, fontSize: 12, color: t.textoSec },
  rangeText: { fontFamily: Fonts.regular, fontSize: 12, color: t.textoSec, marginTop: 6, fontVariant: ['tabular-nums'] },
  noData: { marginTop: 6 },
  noDataValue: { fontFamily: Fonts.semibold, fontSize: 20, color: t.textoSec },
  noDataReason: { fontFamily: Fonts.regular, fontSize: 12, color: t.textoSec, marginTop: 2 },
}));
