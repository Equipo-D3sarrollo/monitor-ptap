import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Ionicons from './AppIcon';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  SOSTENIDOS_MS,
  probarCanal,
  type ProbeResult,
  type CambioObservado,
} from '../services/channel-probe';
import { formatValorCrudo } from '../services/opc-raw';
import { parsearValorComando } from '../services/mapping-mando-form';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * Probar un canal del PLC: escribir un valor, sostenerlo y ver qué se mueve.
 *
 * Es la herramienta de captura que pide `docs/PRUEBA_VALVULA_CARBONERO.md`. Existe porque 8 de las
 * 10 plantas con válvula llevan `open: 4096` heredado de La Vorágine y jamás verificado allí, y
 * ninguna declara `close`: la codificación real no se deduce, se captura.
 *
 * **Tres pasos, y el del medio no se puede saltar.** Esto no es un formulario: es una escritura en
 * un equipo que mueve agua potable. La confirmación dice exactamente qué se va a escribir, dónde, y
 * qué válvulas quedarán bloqueadas mientras dure.
 *
 * El servidor suelta la salida siempre —en un `finally`, con reintentos— y si no lo consigue
 * devuelve `released: false`. Esa es la única línea de esta pantalla que se pinta en rojo a pantalla
 * completa: significa que hay algo puesto en la planta que nadie quitó.
 */
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

type Paso = 'formulario' | 'confirmar' | 'resultado';

function Cambio({ c }: { c: CambioObservado }) {
  const { t } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.cambio}>
      <Text style={styles.cambioRuta}>
        {c.browseName}[{c.index}]
        {c.domainKey ? <Text style={styles.cambioSenal}> · {c.domainKey}</Text> : null}
      </Text>
      <View style={styles.cambioValores}>
        <Text style={styles.cambioDe}>{formatValorCrudo(c.de)}</Text>
        <Ionicons name="arrow-forward" size={13} color={t.antTextoSec} />
        <Text style={styles.cambioA}>{formatValorCrudo(c.a)}</Text>
      </View>
    </View>
  );
}

export function ProbarCanalDialog({
  plantId,
  channel,
  sourceBuffer,
  index,
  domainKey,
  valorActual,
  onCerrar,
}: {
  plantId: string;
  channel: string;
  sourceBuffer: string;
  index: number;
  /** La válvula que manda por aquí, si se sabe. Solo para el texto. */
  domainKey: string | null;
  /** Lo que hay ahora en esa posición, para que se vea a qué se vuelve. */
  valorActual: number | boolean | null;
  onCerrar: () => void;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const [valor, setValor] = useState('');
  const [holdMs, setHoldMs] = useState<number>(300);
  const [paso, setPaso] = useState<Paso>('formulario');
  const [enCurso, setEnCurso] = useState(false);
  const [resultado, setResultado] = useState<ProbeResult | null>(null);

  const reducedMotion = useReducedMotion();

  const parsed = parsearValorComando(valor);
  const listo = parsed !== 'error';

  async function lanzar() {
    if (parsed === 'error') return;
    setEnCurso(true);
    try {
      const r = await probarCanal(plantId, { channel, sourceBuffer, index, value: parsed, holdMs });
      setResultado(r);
      setPaso('resultado');
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Modal visible transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onCerrar}>
      <Pressable style={styles.overlay} onPress={onCerrar} accessibilityLabel="Cerrar el probador">
        <Pressable style={styles.hoja} onPress={() => {}} accessibilityViewIsModal>
          <View style={styles.cabecera}>
            <View style={styles.flex}>
              <Text style={styles.titulo}>Probar canal</Text>
              <Text style={styles.subtitulo} selectable>
                {sourceBuffer}[{index}]
                {domainKey ? ` · ${domainKey}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onCerrar} hitSlop={10} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color={t.antTextoSec} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled">
            {paso === 'formulario' ? (
              <>
                <View style={styles.actual}>
                  <Text style={styles.actualEtiqueta}>Ahora hay</Text>
                  <Text style={styles.actualValor}>{formatValorCrudo(valorActual)}</Text>
                  <Text style={styles.actualNota}>Es el valor al que se vuelve al soltar.</Text>
                </View>

                <View style={styles.campo}>
                  <Text style={styles.campoEtiqueta}>Valor a escribir</Text>
                  <TextInput
                    style={[styles.input, !listo && valor.length > 0 ? styles.inputMal : null]}
                    value={valor}
                    onChangeText={setValor}
                    placeholder="4096"
                    placeholderTextColor={t.antTextoSec}
                    keyboardType="numbers-and-punctuation"
                    accessibilityLabel="Valor a escribir en el canal"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={!listo && valor.length > 0 ? styles.campoError : styles.campoAyuda}>
                    {!listo && valor.length > 0
                      ? 'Tiene que ser un número o true/false.'
                      : 'Se escribe en absoluto, tal cual. En La Vorágine 4096 abre y 8192 cierra; en La Sirena son 1 y 2.'}
                  </Text>
                </View>

                <View style={styles.campo}>
                  <Text style={styles.campoEtiqueta}>Cuánto se sostiene</Text>
                  <View style={styles.chips}>
                    {SOSTENIDOS_MS.map((ms) => (
                      <TouchableOpacity
                        key={ms}
                        style={[styles.chip, holdMs === ms && styles.chipActivo]}
                        onPress={() => setHoldMs(ms)}
                        activeOpacity={0.7}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: holdMs === ms }}
                      >
                        <Text style={[styles.chipTexto, holdMs === ms && styles.chipTextoActivo]}>
                          {ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.campoAyuda}>
                    Pasado ese tiempo la salida vuelve sola a su valor anterior, siempre. El tope son
                    5 s para que un olvido o una desconexión no puedan dejarla energizada.
                  </Text>
                </View>
              </>
            ) : paso === 'confirmar' ? (
              <>
                <View style={styles.peligro}>
                  <Ionicons name="warning" size={20} color={t.critico} />
                  <Text style={styles.peligroTexto}>
                    Esto <Text style={styles.fuerte}>escribe de verdad en el PLC</Text> y puede mover
                    equipo. Hazlo solo dentro de una ventana acordada y con alguien mirando la
                    válvula: en las plantas sin caudal ni palabra de estado, esa persona es la única
                    forma de saber si se movió.
                  </Text>
                </View>

                <View style={styles.resumen}>
                  <Text style={styles.resumenLinea}>
                    Se escribe <Text style={styles.resumenFuerte}>{String(parsed)}</Text> en{' '}
                    <Text style={styles.mono}>
                      {sourceBuffer}[{index}]
                    </Text>
                  </Text>
                  <Text style={styles.resumenLinea}>
                    Se sostiene <Text style={styles.resumenFuerte}>{holdMs} ms</Text> y vuelve a{' '}
                    <Text style={styles.resumenFuerte}>{formatValorCrudo(valorActual)}</Text>
                  </Text>
                  {domainKey ? (
                    <Text style={styles.resumenLinea}>
                      <Text style={styles.mono}>{domainKey}</Text> queda bloqueada mientras dure: no
                      se podrá accionar desde la app.
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.nota}>
                  Queda registrado con tu nombre, el valor y la hora, se haya movido algo o no.
                </Text>
              </>
            ) : resultado ? (
              <>
                {!resultado.released ? (
                  <View style={styles.peligro}>
                    <Ionicons name="alert-circle" size={20} color={t.critico} />
                    <Text style={styles.peligroTexto}>
                      <Text style={styles.fuerte}>La salida NO volvió a su valor anterior.</Text>{' '}
                      {resultado.reason ?? ''} Atiende la planta: puede haber algo energizado.
                    </Text>
                  </View>
                ) : resultado.status === 'done' ? (
                  <View style={styles.exito}>
                    <Ionicons name="checkmark-circle" size={18} color={t.antExito} />
                    <Text style={styles.exitoTexto}>
                      Escrito y soltado. La salida volvió a {formatValorCrudo(resultado.releasedValue)}.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rechazo}>
                    <Ionicons name="close-circle" size={18} color={t.antAdvertencia} />
                    <Text style={styles.rechazoTexto}>{resultado.reason ?? 'No se pudo hacer la prueba.'}</Text>
                  </View>
                )}

                {resultado.status !== 'rejected' ? (
                  <>
                    <View style={styles.filaDato}>
                      <Text style={styles.datoEtiqueta}>Se escribió</Text>
                      <Text style={styles.datoValor}>{formatValorCrudo(resultado.requestedValue)}</Text>
                    </View>
                    <View style={styles.filaDato}>
                      <Text style={styles.datoEtiqueta}>Eco leído</Text>
                      <Text style={styles.datoValor}>
                        {resultado.writeVerified === null
                          ? 'no se pudo leer'
                          : `${formatValorCrudo(resultado.writeEcho)} ${resultado.writeVerified ? '✓' : '✗'}`}
                      </Text>
                    </View>

                    <Text style={styles.seccion}>Qué se movió</Text>
                    {resultado.observed.length > 0 ? (
                      resultado.observed.map((c) => <Cambio key={`${c.browseName}-${c.index}`} c={c} />)
                    ) : (
                      <Text style={styles.vacio}>
                        {resultado.sampled
                          ? 'Nada más cambió mientras la salida estuvo puesta. Si la válvula se movió, este sitio no lo reporta por ningún canal.'
                          : 'No llegó ninguna muestra durante la prueba, así que no se vio nada. Eso NO significa que no cambiara nada: prueba con un sostenido más largo.'}
                      </Text>
                    )}

                    {resultado.observedAfterRelease.length > 0 ? (
                      <>
                        <Text style={styles.seccion}>Y al soltar volvió</Text>
                        {resultado.observedAfterRelease.map((c) => (
                          <Cambio key={`post-${c.browseName}-${c.index}`} c={c} />
                        ))}
                        <Text style={styles.nota}>
                          Que vuelva a su sitio al soltar es lo que demuestra que el cambio venía de
                          esta escritura y no de la planta operando por su cuenta.
                        </Text>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <View style={styles.pie}>
            {paso === 'formulario' ? (
              <>
                <TouchableOpacity style={styles.botonPlano} onPress={onCerrar} activeOpacity={0.8}>
                  <Text style={styles.botonPlanoTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botonPrimario, !listo && styles.botonApagado]}
                  onPress={() => setPaso('confirmar')}
                  disabled={!listo}
                  activeOpacity={0.8}
                >
                  <Text style={styles.botonPrimarioTexto}>Revisar</Text>
                </TouchableOpacity>
              </>
            ) : paso === 'confirmar' ? (
              <>
                <TouchableOpacity
                  style={styles.botonPlano}
                  onPress={() => setPaso('formulario')}
                  activeOpacity={0.8}
                  disabled={enCurso}
                >
                  <Text style={styles.botonPlanoTexto}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botonPeligro, enCurso && styles.botonApagado]}
                  onPress={() => void lanzar()}
                  disabled={enCurso}
                  activeOpacity={0.8}
                  accessibilityLabel="Escribir en el PLC y soltar"
                >
                  {enCurso ? (
                    <ActivityIndicator size="small" color={t.sobreAccion} />
                  ) : (
                    <Text style={styles.botonPrimarioTexto}>Escribir y soltar</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.botonPlano}
                  onPress={() => {
                    setResultado(null);
                    setPaso('formulario');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.botonPlanoTexto}>Otra prueba</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonPrimario} onPress={onCerrar} activeOpacity={0.8}>
                  <Text style={styles.botonPrimarioTexto}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = estilosConTema((t) => ({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  hoja: {
    backgroundColor: t.antFondoTarjeta,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.antDivisor,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.antDivisor,
  },
  titulo: { fontSize: 16, fontWeight: '800', color: t.antTexto },
  subtitulo: { fontFamily: mono, fontSize: 11.5, color: t.antAcento, marginTop: 2 },
  cuerpo: { padding: 14, gap: 12 },
  actual: {
    borderWidth: 1,
    borderColor: t.antDivisor,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  actualEtiqueta: { fontSize: 11, color: t.antTextoSec, textTransform: 'uppercase', letterSpacing: 0.5 },
  actualValor: { fontFamily: mono, fontSize: 24, fontWeight: '800', color: t.antTexto },
  actualNota: { fontSize: 11, color: t.antTextoSec, fontStyle: 'italic' },
  campo: { gap: 5 },
  campoEtiqueta: { fontSize: 12.5, fontWeight: '700', color: t.antTexto },
  input: {
    borderWidth: 1,
    borderColor: t.antDivisor,
    borderRadius: 8,
    backgroundColor: t.antSuperficie,
    paddingHorizontal: 12,
    minHeight: 44,
    fontFamily: mono,
    fontSize: 15,
    color: t.antTexto,
  },
  inputMal: { borderColor: t.critico + '99' },
  campoAyuda: { fontSize: 11, color: t.antTextoSec, lineHeight: 15 },
  campoError: { fontSize: 11, color: t.critico, lineHeight: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: t.antDivisor, paddingHorizontal: 13, paddingVertical: 10 },
  chipActivo: { borderColor: t.antPrimario, backgroundColor: t.antPrimario + '22' },
  chipTexto: { fontFamily: mono, fontSize: 12, color: t.antTextoSec },
  chipTextoActivo: { color: t.antPrimario, fontWeight: '700' },
  peligro: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: t.critico + '99',
    backgroundColor: t.critico + '1A',
    borderRadius: 10,
    padding: 12,
  },
  peligroTexto: { flex: 1, fontSize: 12.5, color: t.antTexto, lineHeight: 18 },
  fuerte: { fontWeight: '800' },
  resumen: {
    borderWidth: 1,
    borderColor: t.antDivisor,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    backgroundColor: t.antSuperficiePagina,
  },
  resumenLinea: { fontSize: 12.5, color: t.antTextoSec, lineHeight: 18 },
  resumenFuerte: { fontFamily: mono, fontWeight: '800', color: t.antTexto },
  mono: { fontFamily: mono, color: t.antAcento },
  nota: { fontSize: 11, color: t.antTextoSec, lineHeight: 16, fontStyle: 'italic' },
  exito: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: t.antExito + '66',
    backgroundColor: t.antExito + '15',
    borderRadius: 10,
    padding: 11,
  },
  exitoTexto: { flex: 1, fontSize: 12.5, color: t.antTexto, lineHeight: 17 },
  rechazo: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: t.antAdvertencia + '77',
    backgroundColor: t.antAdvertencia + '15',
    borderRadius: 10,
    padding: 11,
  },
  rechazoTexto: { flex: 1, fontSize: 12.5, color: t.antTexto, lineHeight: 17 },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datoEtiqueta: { flex: 1, fontSize: 12, color: t.antTextoSec },
  datoValor: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: t.antTexto },
  seccion: {
    fontSize: 11,
    fontWeight: '800',
    color: t.antTextoSec,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 6,
  },
  cambio: {
    borderWidth: 1,
    borderColor: t.antDivisor,
    borderRadius: 8,
    padding: 10,
    gap: 3,
    backgroundColor: t.antSuperficiePagina,
  },
  cambioRuta: { fontFamily: mono, fontSize: 11.5, color: t.antTextoSec },
  cambioSenal: { color: t.antAcento },
  cambioValores: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cambioDe: { fontFamily: mono, fontSize: 13, color: t.antTextoSec, textDecorationLine: 'line-through' },
  cambioA: { fontFamily: mono, fontSize: 14, fontWeight: '800', color: t.antExito },
  vacio: { fontSize: 12, color: t.antTextoSec, lineHeight: 17, fontStyle: 'italic' },
  pie: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: t.antDivisor,
  },
  botonPlano: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.antDivisor,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPlanoTexto: { color: t.antTextoSec, fontSize: 13, fontWeight: '600' },
  botonPrimario: {
    // Texto blanco: sobre `accion` (5,5:1), no sobre el `primary` anterior (3,7:1). Ver D1.
    backgroundColor: t.accion,
    borderRadius: 8,
    paddingHorizontal: 18,
    minHeight: 44,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El botón que de verdad escribe en el PLC va en rojo: no puede parecerse a «Aceptar».
  botonPeligro: {
    backgroundColor: t.critico,
    borderRadius: 8,
    paddingHorizontal: 18,
    minHeight: 44,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonApagado: { opacity: 0.45 },
  botonPrimarioTexto: { color: t.sobreAccion, fontSize: 13.5, fontWeight: '800' },
}));
