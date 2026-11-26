import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '../../components/AppIcon';
import {
  fetchReports,
  generateReport,
  downloadReport,
  type ReportInfo,
} from '../../services/reports';
import { usePlant } from '../../context/PlantContext';
import { useAuth } from '../../context/AuthContext';
import { PlantPickerLayout, PlantPickerTrigger } from '../../components/PlantPicker';
import { toast } from '../../services/toast-store';
import { Fonts } from '../../constants/fonts';
import { formatUnit } from '../../services/units';
import { estilosConTema, useTheme } from '../../context/ThemeContext';

function fechaHora(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ReportesScreen() {
  const { t } = useTheme();
  const styles = useStyles();
  const { selectedPlant } = usePlant();
  const { hasPermission } = useAuth();
  const canView = hasPermission('view_dashboard'); // ver informes = operador/jefe/admin
  const canExport = hasPermission('export_data'); // generar/descargar = solo admin
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null); // metric en acción

  const {
    data: reports,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['reports', selectedPlant.id],
    queryFn: () => fetchReports(selectedPlant.id),
    // No dispara la petición para quien no puede ver (evita un 403 inútil).
    enabled: canView,
    // Refresco frecuente para ver avanzar la recolección (N/total) y pasar a "listo".
    refetchInterval: 8_000,
  });

  // Guard de rol de la pantalla (defensa en el front; el backend igual responde 403). El Civil
  // no ve informes. Va después de TODOS los hooks para no violar las reglas de hooks.
  if (!canView) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.antFondo }}>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}
        >
          <Ionicons name="lock-closed-outline" size={40} color={t.antTextoSec} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: t.antTexto }}>
            Acceso restringido
          </Text>
          <Text style={{ fontSize: 13, color: t.antTextoSec, textAlign: 'center' }}>
            Los informes están disponibles para operador, jefe y administrador.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  async function onGenerate(r: ReportInfo) {
    setBusy(r.metric);
    try {
      await generateReport(selectedPlant.id, r.metric);
      await queryClient.invalidateQueries({ queryKey: ['reports', selectedPlant.id] });
      toast.success('Informe en preparación', `${r.metric} · ${selectedPlant.name}`);
    } catch (err) {
      toast.error('No se pudo generar', err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      setBusy(null);
    }
  }

  async function onDownload(r: ReportInfo) {
    setBusy(r.metric);
    try {
      const ok = await downloadReport(selectedPlant.id, r.metric);
      if (!ok) toast.error('No se pudo descargar', 'El informe aún no está disponible.');
    } catch (err) {
      // Sin este catch, un fallo de red dejaba un rechazo silencioso (a diferencia de Generar).
      toast.error(
        'No se pudo descargar',
        err instanceof Error ? err.message : 'Revisa tu conexión e intenta de nuevo.',
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <PlantPickerLayout>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              colors={[t.antPrimario]}
              tintColor={t.antPrimario}
            />
          }
        >
          <View style={styles.sectionHeader}>
            <PlantPickerTrigger name={selectedPlant.name} textStyle={styles.plantName} />
            <Text style={styles.sectionSubtitle}>
              Informes por métrica · 1 muestra/min por 1 h · automáticos cada 7 días
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Cargando informes…</Text>
            </View>
          ) : isError ? (
            // Distinto de "sin métricas": aquí la petición FALLÓ (backend caído/timeout). Antes esto
            // se confundía con "planta vacía" y desinformaba.
            <View style={styles.loadingWrap}>
              <Ionicons name="cloud-offline-outline" size={34} color={t.antTextoSec} />
              <Text style={styles.loadingText}>No se pudieron cargar los informes.</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                accessibilityRole="button"
                onPress={() => refetch()}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={t.antPrimario} />
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (reports?.length ?? 0) === 0 ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Esta planta no tiene métricas mapeadas.</Text>
            </View>
          ) : (
            reports?.map((r) => (
              <ReportRow
                key={r.metric}
                report={r}
                canExport={canExport}
                busy={busy === r.metric}
                onGenerate={() => onGenerate(r)}
                onDownload={() => onDownload(r)}
              />
            ))
          )}

          {!canExport && (reports?.length ?? 0) > 0 && (
            <Text style={styles.note}>
              Solo un administrador puede generar y descargar informes.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </PlantPickerLayout>
  );
}

function ReportRow({
  report,
  canExport,
  busy,
  onGenerate,
  onDownload,
}: {
  report: ReportInfo;
  canExport: boolean;
  busy: boolean;
  onGenerate: () => void;
  onDownload: () => void;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const collecting = report.status === 'collecting';
  const ready = report.status === 'ready';
  const statusColor = collecting ? t.antAdvertencia : ready ? t.antExito : t.antTextoSec;

  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: statusColor + '18' }]}>
        <Ionicons
          name={
            collecting ? 'hourglass-outline' : ready ? 'document-text-outline' : 'ellipse-outline'
          }
          size={22}
          color={statusColor}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>
          {report.label}
          {report.unit ? <Text style={styles.unit}> ({formatUnit(report.unit)})</Text> : null}
        </Text>
        <Text style={styles.status}>
          {collecting
            ? `Recolectando… ${report.progress ?? 0}/${report.total ?? 0}`
            : ready
              ? `Listo · ${fechaHora(report.generatedAt)} · ${report.rows ?? 0} filas`
              : 'Sin generar'}
        </Text>
      </View>

      {canExport && (
        <View style={styles.actions}>
          {busy ? (
            <ActivityIndicator size="small" color={t.antPrimario} />
          ) : collecting ? (
            <Text style={styles.collectingTag}>en curso</Text>
          ) : (
            <>
              {ready && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={onDownload}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Descargar informe de ${report.label}`}
                >
                  <Ionicons name="download-outline" size={16} color={t.antPrimario} />
                  <Text style={styles.actionText}>Descargar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={onGenerate}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${ready ? 'Regenerar' : 'Generar'} informe de ${report.label}`}
              >
                <Ionicons
                  name={ready ? 'refresh-outline' : 'play-outline'}
                  size={16}
                  color={t.antTextoSec}
                />
                <Text style={[styles.actionText, { color: t.antTextoSec }]}>
                  {ready ? 'Regenerar' : 'Generar'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const useStyles = estilosConTema((t) => ({
  safe: { flex: 1, minWidth: 0, backgroundColor: t.fondo },
  content: { padding: 16, paddingBottom: 28 },
  sectionHeader: { marginBottom: 14, paddingHorizontal: 2 },
  plantName: { fontSize: 22, lineHeight: 30, fontFamily: Fonts.semibold, color: t.texto },
  sectionSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: t.textoSec,
    marginTop: 4,
  },
  loadingWrap: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  loadingText: { color: t.antTextoSec, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontSize: 13, fontWeight: '700', color: t.antPrimario },
  note: {
    fontSize: 12,
    color: t.antTextoSec,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.superficie,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: t.bordeSuave,
    gap: 10,
  },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: t.antTexto },
  unit: { fontSize: 12, fontWeight: '400', color: t.antTextoSec },
  status: { fontSize: 12, color: t.antTextoSec, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12.5, fontWeight: '700', color: t.antPrimario },
  collectingTag: { fontSize: 11.5, fontWeight: '700', color: t.antAdvertencia },
}));
