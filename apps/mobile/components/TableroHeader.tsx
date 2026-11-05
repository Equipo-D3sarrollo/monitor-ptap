import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { Fonts } from '../constants/fonts';
import type { PlantStatus } from '../services/plant-status';
import { formatSince } from '../services/plant-status';
import { PlantPickerTrigger } from './PlantPicker';
import { WaterBackground } from './WaterBackground';

const B = Colors.brand;
const LOGO_RATIO = 459 / 545; // alto / ancho de assets/aquora-logo.png
/** Desde este ancho las cifras clave van a la derecha del nombre (referencia TableroEscritorio). */
const KPI_MIN_WIDTH = 768;

export interface HeaderKpi {
  key: string;
  label: string;
  /** Ya formateado. Solo se pasa si el dato existe en el snapshot: nunca un valor de ejemplo. */
  value: string;
  unit?: string;
  color: string;
  alert: boolean;
}

/**
 * Encabezado del tablero: panel con agua al pie (WaterBackground, el mismo del login con su
 * movimiento continuo), logo, barra de marca, nombre de la planta (abre el selector si es Admin),
 * estado según el dominio y, en pantallas anchas, las cifras clave.
 *
 * Si la planta no está en línea el agua se queda quieta: el encabezado no aparenta vida que no hay.
 */
export function TableroHeader({
  plantName,
  status,
  lastChangeAt,
  kpis,
  right,
}: {
  plantName: string;
  /** null = aún sin snapshot: no se afirma ningún estado. */
  status: PlantStatus | null;
  lastChangeAt: string | null;
  kpis: HeaderKpi[];
  /** Controles a la derecha de la fila superior (reloj, densidad). */
  right?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= KPI_MIN_WIDTH;
  const tone = status ? (status.tone === 'ok' ? B.green : B.gray) : B.gray;
  const toneText = status?.tone === 'ok' ? B.green : B.textSecondary;
  // "Sin datos desde…" ya lleva su hora; a "En vivo"/"Estable" se le añade la del último cambio.
  const since = status?.online && lastChangeAt ? ` · último cambio ${formatSince(lastChangeAt)}` : '';

  return (
    <View style={[styles.header, wide ? styles.headerWide : styles.headerNarrow]}>
      <WaterBackground level={wide ? 0.22 : 0.2} paused={!status?.online} />

      <View style={styles.topRow}>
        <Image
          source={require('../assets/aquora-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Aquora"
        />
        <View style={styles.flex} />
        {right}
      </View>

      <View style={[styles.content, wide && styles.contentWide]}>
        <View style={styles.identity}>
          <View style={styles.brandBar} accessible={false}>
            <View style={[styles.brandSeg, { flex: 55, backgroundColor: B.blue }]} />
            <View style={[styles.brandSeg, { flex: 30, backgroundColor: B.green }]} />
            <View style={[styles.brandSeg, { flex: 15, backgroundColor: B.yellow }]} />
          </View>
          <PlantPickerTrigger name={plantName} textStyle={wide ? styles.nameWide : styles.nameNarrow} />
          <View
            style={styles.statusRow}
            accessible
            accessibilityLabel={status ? `Estado: ${status.label}${since}` : 'Consultando el estado'}
            accessibilityLiveRegion="polite"
          >
            <Ionicons name={(status?.icon ?? 'help-circle-outline') as never} size={14} color={tone} />
            <Text style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: toneText }]}>{status?.label ?? 'Consultando…'}</Text>
              {since}
            </Text>
          </View>
        </View>

        {wide && kpis.length > 0 && (
          <View style={styles.kpis}>
            {kpis.map(k => (
              <View
                key={k.key}
                style={[styles.kpi, k.alert && styles.kpiAlert]}
                accessible
                accessibilityLabel={`${k.label}: ${k.value}${k.unit ? ` ${k.unit}` : ''}${k.alert ? ', fuera de rango' : ''}`}
              >
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={[styles.kpiValue, { color: k.alert ? B.dangerText : k.color }]}>
                  {k.value}
                  {k.unit ? <Text style={styles.kpiUnit}> {k.unit}</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: B.panel,
    borderBottomWidth: 1,
    borderBottomColor: B.divider,
    overflow: 'hidden',
  },
  headerWide: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 112 },
  headerNarrow: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 92 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 52, height: 52 * LOGO_RATIO },
  content: { marginTop: 10, gap: 16 },
  contentWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' },
  identity: { gap: 6, flexShrink: 1 },
  brandBar: { flexDirection: 'row', width: 64, height: 4, borderRadius: 2, overflow: 'hidden' },
  brandSeg: { height: '100%' },
  nameWide: { fontSize: 32, lineHeight: 42 },
  nameNarrow: { fontSize: 26, lineHeight: 34 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontFamily: Fonts.regular, fontSize: 14, color: B.textSecondary, flexShrink: 1 },
  statusLabel: { fontFamily: Fonts.medium },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: {
    minWidth: 132,
    backgroundColor: 'rgba(4,16,26,0.78)',
    borderWidth: 1,
    borderColor: '#1E3A52',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kpiAlert: { borderColor: Colors.danger },
  kpiLabel: { fontFamily: Fonts.regular, fontSize: 12, color: B.textSecondary },
  kpiValue: { fontFamily: Fonts.semibold, fontSize: 24, lineHeight: 32, fontVariant: ['tabular-nums'] },
  kpiUnit: { fontFamily: Fonts.regular, fontSize: 13, color: B.textSecondary },
});
