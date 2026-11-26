import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Ionicons from './AppIcon';
import type { SenalEditable } from '../services/mapping-edit';
import { comandosComoTexto } from '../services/mapping-mando-form';
import { formatWhen } from '../services/notifications';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * Lo que hay detrás de una fila de la tabla de buffers crudos: **de dónde sale ese número y a qué
 * atributo del dominio corresponde.**
 *
 * Existe porque la tabla sola no basta para decidir. Ver que el índice 19 vale 409,50 no dice si eso
 * está bien; para saberlo hay que ver que ese índice lo lee `inletPressure1`, que su unidad es psi,
 * que su rango declarado llega a 232 y que el buffer viene del NodeId tal de la planta cual. Todo
 * eso estaba repartido entre el mapeo, el tablero y la cabeza de quien lo escribió.
 *
 * El nombre en INGLÉS va arriba y en grande a propósito: `outletFlow1` es la clave con la que la
 * señal viaja en el DTO, aparece en los avisos y se busca en el mapeo. La etiqueta en español es
 * para leer; el nombre en inglés es para trabajar.
 */
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function Dato({ etiqueta, valor, ingles }: { etiqueta: string; valor: string; ingles?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>
        {etiqueta}
        {ingles ? <Text style={styles.datoIngles}> · {ingles}</Text> : null}
      </Text>
      <Text style={styles.datoValor} selectable>
        {valor}
      </Text>
    </View>
  );
}

function num(v: number | null): string {
  return v === null ? '—' : String(v).replace('.', ',');
}

export function SenalDetalle({
  senal,
  puedeEditar,
  revirtiendo,
  onEditar,
  onRevertir,
  onProbar,
}: {
  senal: SenalEditable;
  puedeEditar: boolean;
  revirtiendo: boolean;
  onEditar: () => void;
  onRevertir: () => void;
  /** Abre el probador apuntado al canal de mando de esta válvula. Ausente = no se ofrece. */
  onProbar?: () => void;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  // La reversión pide confirmación en el sitio, sin diálogo: deshace un cambio de configuración
  // real y un toque accidental en una lista larga no debería poder hacerlo.
  const [confirmando, setConfirmando] = useState(false);

  return (
    <View style={styles.panel}>
      <View style={styles.cabecera}>
        <View style={styles.flex}>
          <Text style={styles.nombreIngles} selectable>
            {senal.domainKey}
          </Text>
          {senal.label ? <Text style={styles.etiqueta}>{senal.label}</Text> : null}
        </View>
        {senal.override ? (
          <View style={styles.chipOverride}>
            <Ionicons name="create-outline" size={11} color={t.antAdvertencia} />
            <Text style={styles.chipOverrideTexto}>corregida</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.seccion}>De dónde sale</Text>
      <Dato etiqueta="Canal" valor={senal.buffer} ingles="buffer" />
      <Dato etiqueta="Buffer" valor={senal.browseName ?? '—'} ingles="sourceBuffer" />
      <Dato
        etiqueta="NodeId"
        valor={senal.nsUri ? `ns=${senal.nsUri} · ${senal.identifier ?? ''}` : '—'}
      />
      <Dato
        etiqueta="Tipo"
        valor={senal.dataType ? `${senal.dataType}${senal.declaredLength === null ? '' : `[${senal.declaredLength}]`}` : '—'}
      />
      <Dato etiqueta="Índice" valor={String(senal.index)} ingles="index" />

      <Text style={styles.seccion}>A qué atributo corresponde</Text>
      <Dato etiqueta="Unidad" valor={senal.unit ?? '—'} ingles="unit" />
      <Dato etiqueta="Rango físico" valor={`${num(senal.min)} … ${num(senal.max)}`} ingles="min / max" />
      <Dato etiqueta="Rango operativo" valor={`${num(senal.opMin)} … ${num(senal.opMax)}`} ingles="opMin / opMax" />
      <Dato etiqueta="Confianza" valor={senal.confidence} ingles="confidence" />

      {senal.mando ? (
        <>
          <Text style={styles.seccion}>Canal de mando</Text>
          <Dato etiqueta="Sale por" valor={`${senal.mando.browseName} [${senal.mando.index}]`} ingles="write.target" />
          <Dato etiqueta="Verbos" valor={comandosComoTexto(senal.mando.commands)} ingles="write.commands" />
          <Dato etiqueta="Escritura" valor={senal.mando.mode} ingles="write.mode" />
          {senal.mando.stateOpen !== null || senal.mando.stateClosed !== null ? (
            <Dato
              etiqueta="Estado"
              valor={`abierta ${senal.mando.stateOpen ?? '—'} · cerrada ${senal.mando.stateClosed ?? '—'}`}
              ingles="stateEncoding"
            />
          ) : null}

          {/* Que el mando sea `inferred` significa que su codificación se capturó en campo o se
              heredó, no que venga de un documento de la planta. Decirlo aquí es lo que impide que
              alguien lea el valor como un hecho verificado. */}
          {senal.confidence !== 'confirmed' ? (
            <View style={styles.avisoMando}>
              <Ionicons name="alert-circle-outline" size={14} color={t.antAdvertencia} />
              <Text style={styles.avisoMandoTexto}>
                Esta codificación no está confirmada por documento de la planta. Compruébala con el
                probador antes de fiarte de ella.
              </Text>
            </View>
          ) : null}
          {senal.mando.compuesta ? (
            <Text style={styles.overrideTexto}>
              Orden compuesta: escribe varias posiciones en secuencia. Sus verbos y su índice se
              editan en el JSON con revisión, porque el orden de esos pasos es lo que impide
              energizar dos direcciones a la vez.
            </Text>
          ) : null}
        </>
      ) : null}

      {senal.override ? (
        <>
          <Text style={styles.seccion}>Corrección en vigor</Text>
          <Text style={styles.overrideTexto}>
            {senal.override.by ? `La aplicó ${senal.override.by}` : 'Aplicada'}
            {senal.override.at ? ` ${formatWhen(senal.override.at)}` : ''}. El repositorio dice índice{' '}
            {senal.override.base.index ?? '—'}
            {senal.override.base.unit ? ` y unidad ${senal.override.base.unit}` : ''}.
          </Text>
        </>
      ) : null}

      {senal.bloqueada ? (
        <View style={styles.bloqueada}>
          <Ionicons name="lock-closed" size={13} color={t.antTextoSec} />
          <Text style={styles.bloqueadaTexto}>{senal.bloqueada}</Text>
        </View>
      ) : puedeEditar ? (
        <View style={styles.acciones}>
          <TouchableOpacity style={styles.botonPrimario} onPress={onEditar} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={16} color={t.sobreAccion} />
            <Text style={styles.botonPrimarioTexto}>Editar</Text>
          </TouchableOpacity>

          {/* El orden importa y la pantalla lo refleja: primero se SONDEA el canal para descubrir
              qué valor hace qué, y solo después se escribe en el mapeo. Al revés sería usar el mapa
              para explorar el terreno. */}
          {senal.mando && onProbar ? (
            <TouchableOpacity style={styles.botonPlano} onPress={onProbar} activeOpacity={0.8}>
              <Ionicons name="pulse-outline" size={15} color={t.antAcento} />
              <Text style={[styles.botonPlanoTexto, styles.botonProbar]}>Probar canal</Text>
            </TouchableOpacity>
          ) : null}

          {senal.override ? (
            confirmando ? (
              <>
                <TouchableOpacity
                  style={styles.botonPeligro}
                  onPress={() => {
                    setConfirmando(false);
                    onRevertir();
                  }}
                  activeOpacity={0.8}
                  disabled={revirtiendo}
                >
                  {revirtiendo ? (
                    <ActivityIndicator size="small" color={t.critico} />
                  ) : (
                    <Text style={styles.botonPeligroTexto}>Sí, revertir</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonPlano} onPress={() => setConfirmando(false)} activeOpacity={0.8}>
                  <Text style={styles.botonPlanoTexto}>No</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.botonPlano} onPress={() => setConfirmando(true)} activeOpacity={0.8}>
                <Ionicons name="arrow-undo-outline" size={15} color={t.antTextoSec} />
                <Text style={styles.botonPlanoTexto}>Volver al original</Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = estilosConTema((t, nombre) => ({
  panel: {
    backgroundColor: t.antSuperficiePagina,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.antDivisor,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
    gap: 2,
  },
  flex: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  nombreIngles: { fontFamily: mono, fontSize: 14, fontWeight: '800', color: t.antAcento },
  etiqueta: { fontSize: 12, color: t.antTextoSec, marginTop: 1 },
  chipOverride: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: t.antAdvertencia + '77',
    backgroundColor: t.antAdvertencia + '18',
  },
  chipOverrideTexto: { fontSize: 10, color: t.antAdvertencia, fontWeight: '700' },
  seccion: {
    fontSize: 10.5,
    fontWeight: '700',
    color: t.antTextoSec,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
  },
  dato: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 3 },
  datoEtiqueta: { flex: 1, fontSize: 11.5, color: t.antTextoSec },
  datoIngles: { fontFamily: mono, fontSize: 10.5, color: t.antTextoSec },
  datoValor: { flex: 1.2, fontFamily: mono, fontSize: 11.5, color: t.antTexto, textAlign: 'right' },
  overrideTexto: { fontSize: 11.5, color: t.antTextoSec, lineHeight: 16 },
  avisoMando: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: t.antAdvertencia + '66',
    backgroundColor: t.antAdvertencia + '15',
    borderRadius: 8,
    padding: 9,
  },
  avisoMandoTexto: { flex: 1, fontSize: 11, color: t.antTexto, lineHeight: 15 },
  botonProbar: { color: t.antAcento },
  bloqueada: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: t.antDivisor,
  },
  bloqueadaTexto: { flex: 1, fontSize: 11.5, color: t.antTextoSec, lineHeight: 16 },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: t.antDivisor,
  },
  botonPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.accion, // D1: texto blanco sobre `accion` (5,5:1), no sobre `primary` (3,7:1)
    borderRadius: 8,
    paddingHorizontal: 14,
    // 44 px de alto: se usa de pie y a veces con guantes.
    minHeight: 44,
    justifyContent: 'center',
  },
  botonPrimarioTexto: { color: t.sobreAccion, fontSize: 13, fontWeight: '700' },
  botonPlano: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.antDivisor,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  botonPlanoTexto: { color: t.antTextoSec, fontSize: 13, fontWeight: '600' },
  botonPeligro: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.critico + '77',
    backgroundColor: t.critico + '18',
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPeligroTexto: { color: t.critico, fontSize: 13, fontWeight: '700' },
}));
