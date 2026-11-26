import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from './AppIcon';
import { SwitchRow } from './SwitchRow';
import {
  NIVELES_DE_GRAVEDAD,
  TIPOS_DE_AVISO,
  useNotificationPrefs,
} from '../services/notification-prefs';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * Elegir qué SUENA fuera de la aplicación.
 *
 * Solo hay dos modos, y valen para todo: con sonido (bandeja + panel del teléfono) o silenciado
 * (bandeja, sin sonar fuera). Cuatro decisiones que conviene no revertir:
 *
 *  - **Silenciar no esconde.** El aviso sigue en la bandeja y sigue contando en la campana. La
 *    diferencia entre «no me molestes con esto» y «esto no existió» es la que hace falta cuando hay
 *    que reclamar algo tres semanas después.
 *  - **El ajuste es de la CUENTA, no del teléfono.** Se guarda en el servidor: sobrevive a cerrar
 *    sesión y a cambiar de dispositivo.
 *  - **Las maniobras de válvula no se pueden callar.** Son el registro que sustituye a la
 *    confirmación eléctrica que estas plantas no dan; por eso no aparecen entre los interruptores.
 *  - **Lo crítico atraviesa el horario de silencio**, pero no un silencio explícito: si alguien
 *    calló ese sensor a propósito, se respeta.
 *
 * El ámbito por planta NO se toca aquí: cada quien sigue recibiendo solo lo de su planta, y eso no
 * es una preferencia sino un permiso.
 */

/** Franjas de silencio ofrecidas. La mayoría quiere «de noche no», no configurar un reloj. */
const FRANJAS: { etiqueta: string; desde: string | null; hasta: string | null }[] = [
  { etiqueta: 'Sin silencio', desde: null, hasta: null },
  { etiqueta: '22:00 – 06:00', desde: '22:00', hasta: '06:00' },
  { etiqueta: '20:00 – 07:00', desde: '20:00', hasta: '07:00' },
  { etiqueta: '18:00 – 08:00', desde: '18:00', hasta: '08:00' },
];

export function NotificationPrefsCard() {
  const { t } = useTheme();
  const styles = useStyles();
  const { prefs, guardando, error, alternarTipo, fijarGravedad, fijarSilencio, reactivarItems } =
    useNotificationPrefs();
  const activos = TIPOS_DE_AVISO.filter((t) => !prefs.mutedKinds.includes(t.kind)).length;

  return (
    <View style={styles.card}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Qué te suena en el dispositivo</Text>
        {guardando ? <ActivityIndicator size="small" color={t.antPrimario} /> : null}
      </View>
      <Text style={styles.ayuda}>
        {activos === TIPOS_DE_AVISO.length
          ? 'Ahora mismo te suena todo. Apaga lo que no quieras que te suene fuera de la app.'
          : `Te suenan ${activos} de ${TIPOS_DE_AVISO.length} tipos.`}{' '}
        Lo silenciado sigue apareciendo en la bandeja: no se pierde nada.
      </Text>

      {TIPOS_DE_AVISO.map((t) => (
        <SwitchRow
          key={t.kind}
          titulo={t.titulo}
          detalle={t.detalle}
          valor={!prefs.mutedKinds.includes(t.kind)}
          onChange={() => alternarTipo(t.kind)}
          disabled={guardando}
        />
      ))}

      <View style={styles.nota}>
        <Ionicons name="git-commit-outline" size={15} color={t.antPrimario} />
        <Text style={styles.notaTexto}>
          Las maniobras de válvula siempre suenan. Como el equipo no confirma eléctricamente que la
          válvula se movió, saber quién la movió y cuándo es la única constancia que queda.
        </Text>
      </View>

      <View style={styles.separador} />

      <Text style={styles.subtitulo}>Gravedad mínima</Text>
      <View style={styles.opciones}>
        {NIVELES_DE_GRAVEDAD.map((n) => {
          const activo = prefs.minSeverity === n.valor;
          return (
            <Pressable
              key={n.valor}
              style={[styles.chip, activo && styles.chipActivo]}
              onPress={() => fijarGravedad(n.valor)}
              disabled={guardando}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${n.titulo}. ${n.detalle}`}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{n.titulo}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.ayuda}>
        {NIVELES_DE_GRAVEDAD.find((n) => n.valor === prefs.minSeverity)?.detalle}
      </Text>

      <View style={styles.separador} />

      <Text style={styles.subtitulo}>No molestar</Text>
      <View style={styles.opciones}>
        {FRANJAS.map((f) => {
          const activo = prefs.quietFrom === f.desde && prefs.quietTo === f.hasta;
          return (
            <Pressable
              key={f.etiqueta}
              style={[styles.chip, activo && styles.chipActivo]}
              onPress={() => fijarSilencio(f.desde, f.hasta)}
              disabled={guardando}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`Horario de silencio: ${f.etiqueta}`}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{f.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.nota}>
        <Ionicons name="alert-circle-outline" size={15} color={t.antAdvertencia} />
        <Text style={styles.notaTexto}>
          Durante el silencio, el teléfono no suena pero los avisos siguen llegando a la bandeja. Lo
          crítico —un tanque rebosando— suena igual.
        </Text>
      </View>

      {prefs.mutedItems.length > 0 && (
        <>
          <View style={styles.separador} />
          <Text style={styles.subtitulo}>Señales silenciadas una a una</Text>
          <Text style={styles.ayuda}>
            Has callado {prefs.mutedItems.length}{' '}
            {prefs.mutedItems.length === 1 ? 'señal' : 'señales'} desde el tablero, con la campana de
            su tarjeta. Siguen apareciendo en la bandeja.
          </Text>
          <View style={styles.opciones}>
            {prefs.mutedItems.slice(0, 8).map((clave) => (
              <View key={clave} style={styles.silenciado}>
                <Ionicons name="notifications-off" size={13} color={t.antAdvertencia} />
                {/* La clave es `planta:senal`; se enseña tal cual porque es lo que permite
                    reconocerla, y quien la calló sabe cuál es. */}
                <Text style={styles.silenciadoTexto}>{clave}</Text>
              </View>
            ))}
            {prefs.mutedItems.length > 8 && (
              <Text style={styles.ayuda}>y {prefs.mutedItems.length - 8} más</Text>
            )}
          </View>
          <Pressable
            style={styles.reactivar}
            onPress={reactivarItems}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel="Devolver el sonido a todas las señales silenciadas"
          >
            <Text style={styles.reactivarTexto}>Devolverles el sonido a todas</Text>
          </Pressable>
        </>
      )}

      {error ? (
        <View style={styles.error}>
          <Ionicons name="cloud-offline-outline" size={15} color={t.critico} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = estilosConTema((t) => ({
  card: {
    backgroundColor: t.antFondoTarjeta,
    borderWidth: 1,
    borderColor: t.antDivisor,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titulo: { fontSize: 14, fontWeight: '700', color: t.antTexto },
  subtitulo: { fontSize: 13, fontWeight: '700', color: t.antTexto, marginBottom: 8 },
  ayuda: { fontSize: 12, lineHeight: 17, color: t.antTextoSec, marginTop: 4 },
  separador: { height: 1, backgroundColor: t.antDivisor, marginVertical: 14 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    // 40 px de alto: se toca de pie, delante de un tablero.
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.antDivisor,
  },
  chipActivo: { borderColor: t.antPrimario, backgroundColor: t.antPrimario + '22' },
  chipTexto: { fontSize: 12.5, fontWeight: '600', color: t.antTextoSec },
  chipTextoActivo: { color: t.antPrimario },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
  notaTexto: { flex: 1, fontSize: 11.5, lineHeight: 16, color: t.antTextoSec },
  silenciado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: t.antAdvertencia + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  silenciadoTexto: { fontSize: 11.5, color: t.antTextoSec },
  reactivar: { marginTop: 10, paddingVertical: 10 },
  reactivarTexto: { fontSize: 13, fontWeight: '600', color: t.antPrimario },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  errorTexto: { flex: 1, fontSize: 12, color: t.critico },
}));
