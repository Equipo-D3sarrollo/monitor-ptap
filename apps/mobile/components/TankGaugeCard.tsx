import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { memo, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { TankAutonomyDto } from '../services/api';
import type { TankView } from '../services/tanks';
import { tankFill } from '../services/card-look';
import { useValueFlash } from '../hooks/useValueFlash';
import Colors from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { BotonSilencio } from './BotonSilencio';
import { sameTankCard } from './memo-compare';

const B = Colors.brand;
/** Agua del tanque: el azul medio de las olas del login. */
const WATER = Colors.login.waveMid;

/** Cambio de nivel por debajo del cual no vale la pena animar (en puntos porcentuales).
 *  La animación de ancho NO puede usar el driver nativo, así que cada tween corre en el hilo de
 *  JS. Con un push cada ~2 s y varios tanques por planta, animar un cambio imperceptible es puro
 *  coste: por debajo de este umbral se salta al valor final. */
const MIN_DELTA_PCT = 0.5;

interface Props {
  tank: TankView;
  /** La planta está congelada (sin conexión, mostrando la última lectura). Atenúa la tarjeta,
   *  la marca como congelada y NO anima la barra (los valores son viejos, no deben "moverse"). */
  frozen?: boolean;
  /** Planta del tanque, para la campana de silencio. Sin ella, la campana no se pinta. */
  plantId?: string;
}

/**
 * Clave con la que llegan los avisos de este tanque (`tank1`, `tank2`…), que no es su `id` de
 * pantalla (`tank-1`). Silenciar tiene que apuntar exactamente al mismo sujeto que emite el
 * backend, o el botón no callaría nada y nadie entendería por qué.
 */
function sujetoDelTanque(id: string): string | null {
  const m = /^tank-(\d+)$/.exec(id);
  return m ? `tank${m[1]}` : null;
}

function TankGaugeCardBase({ tank, frozen = false, plantId }: Props) {
  // percentage llega null hasta que la planta confirme la capacidad real del tanque;
  // en ese caso NO se dibuja % de llenado (sería inventado), solo nivel y volumen reales.
  //
  // Se separan dos cosas que antes eran una sola y por eso ocultaban un fallo:
  //  - `pctReal`  es lo que se ESCRIBE. Puede pasar de 100 (Carbonero midió 2.96 m contra un
  //     máximo configurado de 2.80 → 106 %). Recortarlo hacía que el tanque dijera "lleno"
  //     mientras seguía subiendo sin derramar, que es exactamente el defecto reportado.
  //  - `pct` es lo que se DIBUJA, acotado a [0,100] porque el tanque no tiene dónde crecer.
  //
  // Sin semáforo Alto/Medio/Bajo: pintaba de rojo un nivel bajo que no estaba fuera de rango. El
  // rojo es solo para fuera de rango (incluido el rebose, que lo es).
  const pctReal = tank.percentage;
  const fill = tankFill(pctReal);
  const pct = fill.drawPct;
  const flash = useValueFlash(tank.levelM, frozen);
  const hasLevel = tank.levelM !== null;
  // Fuera de rango: aviso del backend, o una lectura físicamente imposible (nivel negativo o
  // por encima del 100 % del tanque). Se muestra el valor crudo + etiqueta roja (política acordada).
  const outOfRange =
    tank.outOfRange ||
    (hasLevel && (tank.levelM as number) < 0) ||
    (tank.percentage !== null && (tank.percentage < 0 || tank.percentage > 100));
  const autonomia = autonomiaTexto(tank.autonomy);
  const sujeto = sujetoDelTanque(tank.id);
  const fillAnim = useRef(new Animated.Value(0)).current;
  /** Último valor al que se llevó la barra: permite saltarse los tweens imperceptibles. */
  const shownPct = useRef<number | null>(null);

  useEffect(() => {
    if (pct === null) return;
    const previous = shownPct.current;
    shownPct.current = pct;
    // Congelado: saltar al valor sin animar (el dato es viejo, no debe "moverse" en pantalla).
    // Primer render o cambio imperceptible: también se salta, para no gastar el hilo de JS en un
    // tween que nadie distingue (la barra de ancho no admite driver nativo).
    if (frozen || previous === null || Math.abs(pct - previous) < MIN_DELTA_PCT) {
      fillAnim.setValue(pct);
      return;
    }
    // Tween corto para que la barra acompañe al número sin quedar 900 ms por detrás.
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, frozen, fillAnim]);

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const fmtM = (m: number) => m.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tankLabel =
    fill.kind === 'unconfirmed'
      ? `${tank.name}: capacidad sin confirmar`
      : `${tank.name} al ${Math.round(pctReal as number)} %${fill.kind === 'overflow' ? ', rebosando' : ''}`;

  return (
    <View style={[styles.card, outOfRange && styles.cardAnomaly, frozen && styles.cardFrozen]}>
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
      <View style={styles.row}>
        {/* Tanque: el agua sube hasta el % real (tope 100). Sin capacidad confirmada, vacío y punteado. */}
        <View
          style={[
            styles.tank,
            fill.kind === 'unconfirmed' && styles.tankUnknown,
            fill.kind === 'overflow' && styles.tankOverflow,
          ]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={tankLabel}
        >
          {pct !== null ? (
            <Animated.View style={[styles.water, { height: fillHeight }]} />
          ) : (
            <Ionicons name="help" size={22} color={B.gray} style={styles.tankHelp} />
          )}
          {tank.levelOpMax !== null && fill.kind !== 'unconfirmed' && <View style={styles.maxMark} />}
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {tank.name}
            </Text>
            {plantId && sujeto ? <BotonSilencio plantId={plantId} subject={sujeto} etiqueta={tank.name} /> : null}
          </View>

          {fill.kind === 'unconfirmed' ? (
            <>
              <Text style={styles.big}>{hasLevel ? `${fmtM(tank.levelM as number)} m` : 'Sin dato'}</Text>
              <Text style={styles.muted}>Capacidad sin confirmar</Text>
            </>
          ) : (
            // El número es el REAL, sin recortar: si marca 106 % hay que verlo, no esconderlo.
            <Text style={[styles.big, outOfRange && { color: B.dangerText }]}>
              {Math.round(pctReal as number)}
              <Text style={styles.unit}> %</Text>
            </Text>
          )}

          {fill.kind === 'overflow' && (
            <View style={styles.tag}>
              <Ionicons name="alert-circle" size={13} color={Colors.danger} />
              <Text style={[styles.tagText, { color: B.dangerText }]}>
                Rebose: por encima del máximo ({tank.levelOpMax !== null ? `${fmtM(tank.levelOpMax)} m` : '—'}). O el
                tanque está rebosando, o ese máximo está mal.
              </Text>
            </View>
          )}
          {outOfRange && fill.kind !== 'overflow' && (
            <View style={styles.tag}>
              <Ionicons name="alert-circle" size={13} color={Colors.danger} />
              <Text style={[styles.tagText, { color: B.dangerText }]}>Fuera de rango</Text>
            </View>
          )}
          {frozen && (
            <View style={styles.tag}>
              <Ionicons name="time-outline" size={13} color={B.gray} />
              <Text style={styles.tagText}>Congelado</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.info}>
        <InfoRow
          label="Nivel"
          value={tank.levelM !== null ? `${fmtM(tank.levelM)} m` : 'Sin dato'}
        />
        {(tank.levelOpMin !== null || tank.levelOpMax !== null) && (
          <InfoRow
            label="Rango operativo"
            value={`${tank.levelOpMin !== null ? fmtM(tank.levelOpMin) : '—'} – ${tank.levelOpMax !== null ? fmtM(tank.levelOpMax) : '—'} m`}
          />
        )}
        <InfoRow label="Volumen" value={tank.volumeM3 !== null ? `${tank.volumeM3.toFixed(1)} m³` : 'Sin dato'} />
        {autonomia && (
          <InfoRow
            label={autonomia.basis === 'vaciado_real' ? 'Autonomía' : 'Autonomía si cierras'}
            value={autonomia.texto}
            hint={autonomia.pie}
          />
        )}
      </View>
    </View>
  );
}

/** Memo con comparación POR VALOR — ver `memo-compare.ts`. */
export const TankGaugeCard = memo(TankGaugeCardBase, sameTankCard);

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {/* El pie dice de dónde sale el número. Sin él, "4 h" con la entrada abierta se leería como
          una cuenta atrás cuando en realidad el tanque no se está vaciando. */}
      {hint ? <Text style={styles.infoHint}>{hint}</Text> : null}
    </View>
  );
}

/** Horas y minutos como los diría un operador: «3 h 20 min», «45 min». */
function humanHoras(horas: number): string {
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  const h = Math.floor(horas);
  const min = Math.round((horas - h) * 60);
  return min === 0 ? `${h} h` : `${h} h ${min} min`;
}

/**
 * Texto de la autonomía, o `null` si no hay nada honesto que decir.
 *
 * El número lo calcula el BACKEND con un temporizador estable; aquí solo se redacta. Los dos casos
 * se distinguen a propósito porque significan cosas distintas: con la entrada cerrada es una cuenta
 * atrás real, y con la entrada abierta es un supuesto —«si cerraras ahora»— con el consumo medio del
 * día. Enseñar ambos igual haría creer al operario que el tanque se está vaciando cuando no.
 */
function autonomiaTexto(a: TankAutonomyDto | null): { texto: string; pie: string; basis: TankAutonomyDto['basis'] } | null {
  if (!a || a.hoursTo0 === null) return null;
  // Separador de punto medio y no una coma: «15 h 58 min, 7 h 58 min» con coma se lee como una sola
  // cifra con decimales, y son dos duraciones distintas.
  const hasta50 = a.hoursTo50 !== null && a.hoursTo50 > 0 ? ` · ${humanHoras(a.hoursTo50)} al 50 %` : '';
  return {
    basis: a.basis,
    texto: `${humanHoras(a.hoursTo0)}${hasta50}`,
    pie:
      a.basis === 'vaciado_real'
        ? `Entrada cerrada · vaciándose a ${a.flowLps.toFixed(1)} l/s`
        : `Proyección con el consumo medio del día (${a.flowLps.toFixed(1)} l/s)`,
  };
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    padding: 16,
    backgroundColor: B.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1B3044',
    overflow: 'hidden',
  },
  cardAnomaly: { borderColor: Colors.danger, borderWidth: 1.5 },
  cardFrozen: { opacity: 0.6 },
  flash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(36,145,204,0.12)' },
  row: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  tank: {
    width: 64,
    height: 92,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: B.searchBorder,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tankUnknown: { borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  tankOverflow: { borderColor: Colors.danger },
  tankHelp: { alignSelf: 'center' },
  water: { width: '100%', backgroundColor: WATER },
  maxMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: B.textSecondary,
    opacity: 0.6,
  },
  body: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontFamily: Fonts.semibold, fontSize: 15, color: B.text },
  big: { fontFamily: Fonts.semibold, fontSize: 30, lineHeight: 38, color: B.text, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: Fonts.regular, fontSize: 15, color: B.textSecondary },
  muted: { fontFamily: Fonts.medium, fontSize: 13, color: B.textSecondary },
  tag: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  tagText: { flex: 1, fontFamily: Fonts.medium, fontSize: 12, color: B.textSecondary },
  info: { gap: 4 },
  /**
   * Etiqueta a la izquierda, valor a la derecha — y si no caben juntos, el valor baja ENTERO a su
   * propia línea.
   *
   * Sin `gap` y sin control de encogido se leía «Autonomía si cierras15 h 58 min»: los dos textos
   * pegados y el valor partido por la mitad. `flexWrap` + un `minWidth` en el valor es lo que hace
   * que salte de línea en bloque en vez de romperse; el `gap` garantiza que nunca se toquen.
   */
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  infoLabel: { fontFamily: Fonts.regular, fontSize: 12, color: B.textSecondary, flexShrink: 1 },
  infoValue: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: B.text,
    flexGrow: 1,
    // Por debajo de esto no se comprime: prefiere bajar de línea antes que quedar en una columna
    // de dos caracteres.
    minWidth: 96,
    textAlign: 'right',
  },
  infoHint: { fontFamily: Fonts.regular, fontSize: 11, color: B.textSecondary, marginTop: -2, marginBottom: 2 },
});
