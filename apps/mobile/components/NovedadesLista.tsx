import { View, Text } from 'react-native';
import Ionicons from './AppIcon';
import { ListSkeleton } from './Skeleton';
import { OfflineNotice } from './OfflineNotice';
import type { Novedad } from '../services/novedades';
import { Fonts } from '../constants/fonts';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * El changelog, dentro de la bandeja.
 *
 * Render PROPIO y no una fila de notificación: una novedad no tiene planta, ni gravedad, ni «visto»
 * por usuario, ni se puede tocar para ir a ningún sitio. Reutilizar `NotificationRow` habría
 * obligado a inventarle esos campos.
 *
 * La entrada marcada como nueva se resalta y **se queda resaltada mientras se lee**: la marca de
 * leído se escribe al abrir la pestaña, pero el resalte se decide una sola vez al entrar. Si
 * dependiera del estado guardado, el recuadro se apagaría delante del usuario.
 */
export function NovedadesLista({
  novedades,
  versionNueva,
  isLoading,
  isError,
  onRetry,
}: {
  novedades: Novedad[];
  /** Versión que estaba sin ver al entrar, o null. */
  versionNueva: string | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  if (isLoading) return <ListSkeleton rows={2} label="Cargando las novedades" />;

  if (isError) {
    return (
      <OfflineNotice
        title="No se pudieron cargar las novedades."
        detail="El listado vive en el servidor. Sin conexión no hay copia local que mostrar."
        onRetry={onRetry}
        retryLabel="Reintentar la carga de novedades"
      />
    );
  }

  if (novedades.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="sparkles-outline" size={40} color={t.antTextoSec} />
        <Text style={styles.emptyTitle}>Todavía nada que contar</Text>
        <Text style={styles.emptyText}>
          Aquí aparecerá lo que cambie en cada versión de la aplicación, con la más reciente arriba.
        </Text>
      </View>
    );
  }

  return (
    <>
      {novedades.map((n) => {
        const nueva = versionNueva !== null && n.version === versionNueva;
        return (
          <View key={n.version} style={[styles.card, nueva && styles.cardNueva]}>
            <View style={styles.head}>
              <Text style={styles.version}>Versión {n.version}</Text>
              {nueva && (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>NUEVO</Text>
                </View>
              )}
              {n.fecha.length > 0 && <Text style={styles.fecha}>{n.fecha}</Text>}
            </View>
            {n.puntos.map((p, i) => (
              <View key={i} style={styles.punto}>
                <Ionicons name="ellipse" size={5} color={t.antPrimario} style={styles.bullet} />
                <Text style={styles.puntoTexto}>{p}</Text>
              </View>
            ))}
          </View>
        );
      })}
      <Text style={styles.pie}>
        Esta lista es de la aplicación, no de la planta: no lleva avisos ni se puede filtrar por
        sensor. La versión que tienes instalada se ve en Ajustes.
      </Text>
    </>
  );
}

const useStyles = estilosConTema((t) => ({
  card: {
    backgroundColor: t.antFondo,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.antDivisor,
    borderLeftWidth: 4,
    borderLeftColor: t.antPrimario,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardNueva: { backgroundColor: t.antPrimario + '0E', borderColor: t.antPrimario + '55' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  version: { fontFamily: Fonts.semibold, fontSize: 15, color: t.antTexto },
  fecha: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: t.antTextoSec,
    marginLeft: 'auto',
  },
  pill: {
    // Texto blanco: sobre `accion` (5,5:1), no sobre el `primary` anterior (3,7:1). Ver D1.
    backgroundColor: t.accion,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: { fontFamily: Fonts.semibold, color: t.sobreAccion, fontSize: 11, letterSpacing: 0.6 },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  // El punto se alinea con la primera línea del texto, no con el centro del bloque.
  bullet: { marginTop: 6 },
  puntoTexto: {
    fontFamily: Fonts.regular,
    flex: 1,
    fontSize: 14,
    color: t.antTextoSec,
    lineHeight: 21,
  },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontFamily: Fonts.semibold, fontSize: 16, color: t.antTexto },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: t.antTextoSec,
    textAlign: 'center',
    lineHeight: 21,
  },
  pie: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: t.antTextoSec,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
}));
