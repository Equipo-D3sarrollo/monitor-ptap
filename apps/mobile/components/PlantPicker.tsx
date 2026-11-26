import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from './AppIcon';
import Svg, { Path } from './WaterVector';
import { useQuery } from '@tanstack/react-query';
import { PLANTS, usePlant, type PlantOption } from '../context/PlantContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useWebEscape } from '../hooks/useWebEscape';
import { useLoadWait } from '../hooks/useLoadWait';
import { fetchPlants } from '../services/api';
import {
  PLANT_FILTERS,
  filterRows,
  pickerRows,
  type PickerRow,
  type PlantFilter,
} from '../services/plant-picker';
import type { PlantStatusTone } from '../services/plant-status';
import type { Paleta } from '../constants/theme';
import { estilosConTema, sombraTarjeta, useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/fonts';

const NATIVE = Platform.OS !== 'web';
/** Desde este ancho el tablero muestra el selector como panel lateral fijo; por debajo, hoja inferior. */
export const PICKER_PANEL_MIN_WIDTH = 1024;

function toneDe(t: Paleta): Record<PlantStatusTone, { icon: string; text: string }> {
  return {
    ok: { icon: t.enVivo, text: t.enVivo },
    muted: { icon: t.integracion, text: t.textoSec },
  };
}

/**
 * Estado en vivo de las 12 plantas (`GET /api/plants`). Solo se monta si el usuario puede cambiar
 * de planta: para los demás el selector no existe. Sondea cada 30 s únicamente mientras el
 * selector está montado (la cadencia global de la app es "sin sondeo").
 */
function usePickerRows() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['plants'],
    queryFn: fetchPlants,
    refetchInterval: 30_000,
  });
  const rows = useMemo(() => pickerRows(PLANTS, data), [data]);
  return { rows, isLoading, isError };
}

/** Panel lateral de escritorio (≥ 1024 px). Devuelve null si el usuario no puede cambiar de planta. */
export function PlantPickerPanel() {
  const styles = useStyles();
  const { canSwitchPlant } = usePlant();
  if (!canSwitchPlant) return null;
  return (
    <View style={styles.panel} role="region" aria-label="Plantas">
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle} accessibilityRole="header">
          Plantas
        </Text>
        <Text style={styles.panelCount}>{PLANTS.length}</Text>
      </View>
      <PickerBody layout="list" />
    </View>
  );
}

/** Marco compartido para igualar la lista lateral del tablero en las pantallas operativas. */
export function PlantPickerLayout({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  return (
    <View style={styles.screenRow}>
      {width >= PICKER_PANEL_MIN_WIDTH && <PlantPickerPanel />}
      {children}
    </View>
  );
}

/**
 * Nombre de la planta. Para quien puede cambiar de planta en pantallas estrechas, es un botón con
 * chevrón que abre la hoja "Elegir planta"; para los demás (y con el panel lateral visible) es
 * solo el título.
 */
export function PlantPickerTrigger({ name, textStyle }: { name: string; textStyle?: object }) {
  const { t } = useTheme();
  const styles = useStyles();
  const { canSwitchPlant } = usePlant();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!canSwitchPlant || width >= PICKER_PANEL_MIN_WIDTH) {
    return (
      <Text style={[styles.triggerText, textStyle]} accessibilityRole="header">
        {name}
      </Text>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={`Planta ${name}. Cambiar de planta`}
        aria-haspopup="dialog"
      >
        <Text style={[styles.triggerText, textStyle]} numberOfLines={1}>
          {name}
        </Text>
        <Ionicons name="chevron-down" size={20} color={t.enlace} />
      </Pressable>
      {open && <PlantSheet onClose={close} />}
    </>
  );
}

/** Reutiliza el catálogo y la selección del tablero, también desde la búsqueda de cabecera. */
export function PlantSheet({
  onClose,
  onPicked = onClose,
  searchOnly = false,
}: {
  onClose: () => void;
  onPicked?: () => void;
  searchOnly?: boolean;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const reduce = useReduceMotion();
  const { height, width } = useWindowDimensions();
  const centered = searchOnly && width >= PICKER_PANEL_MIN_WIDTH;
  const [progress] = useState(() => new Animated.Value(0));
  useWebEscape(true, onClose);

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      progress.setValue(1);
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
  }, [reduce, progress]);

  const sheetHeight = Math.min(640, Math.round(height * 0.82));

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el selector de plantas"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          centered && styles.searchDialog,
          {
            height: sheetHeight,
            ...(centered ? { left: (width - 520) / 2, top: (height - sheetHeight) / 2 } : {}),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [sheetHeight, 0],
                }),
              },
            ],
          },
        ]}
        accessibilityViewIsModal
        role="dialog"
        aria-label={searchOnly ? 'Buscar planta en el tablero' : 'Elegir planta'}
      >
        {!centered && <View style={styles.grabber} />}
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {searchOnly ? 'Buscar planta' : 'Elegir planta'}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={22} color={t.textoSec} />
          </Pressable>
        </View>
        <PickerBody
          layout={searchOnly ? 'list' : 'grid'}
          onPicked={onPicked}
          searchOnly={searchOnly}
        />
      </Animated.View>
    </Modal>
  );
}

/** Buscador + filtros + plantas. `list` = filas del panel; `grid` = tarjetas de 2 columnas de la hoja. */
function PickerBody({
  layout,
  onPicked,
  searchOnly = false,
}: {
  layout: 'list' | 'grid';
  onPicked?: () => void;
  searchOnly?: boolean;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const { selectedPlant, setSelectedPlant } = usePlant();
  const { rows, isLoading, isError } = usePickerRows();
  // Si la consulta del estado se queda colgada, a los 15 s la lista deja de decir «Consultando…».
  const sinRespuesta = useLoadWait(isLoading) === 'sin_respuesta';
  const failed = isError || sinRespuesta;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PlantFilter>('todas');
  const [focused, setFocused] = useState(false);
  const shown = useMemo(() => filterRows(rows, query, filter), [rows, query, filter]);

  const pick = (plant: PlantOption) => {
    setSelectedPlant(plant);
    onPicked?.();
  };

  return (
    <View style={styles.body}>
      <View style={[styles.search, focused && styles.searchFocus]}>
        <Ionicons name="search" size={18} color={t.placeholder} />
        <TextInput
          autoFocus={searchOnly}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar planta"
          placeholderTextColor={t.placeholder}
          accessibilityLabel="Buscar planta"
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.searchInput}
        />
      </View>

      {!searchOnly && (
        <View style={styles.filters} role="group" aria-label="Filtrar por estado">
          {PLANT_FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                hitSlop={{ top: 4, bottom: 4 }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                aria-pressed={on}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {failed && (
        <Text style={styles.note} accessibilityLiveRegion="polite">
          {isError
            ? 'No se pudo consultar el estado de las plantas. Puedes elegir igual.'
            : 'El servidor no responde todavía. Puedes elegir igual.'}
        </Text>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.flex}
        contentContainerStyle={layout === 'grid' ? styles.grid : styles.list}
      >
        {shown.length === 0 ? (
          <Text style={styles.note}>Ninguna planta coincide.</Text>
        ) : (
          shown.map((row) => (
            <PlantItem
              key={row.plant.id}
              row={row}
              layout={layout}
              loading={isLoading && !sinRespuesta}
              failed={failed}
              selected={row.plant.id === selectedPlant.id}
              onPress={pick}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PlantItem({
  row,
  layout,
  loading,
  failed,
  selected,
  onPress,
}: {
  row: PickerRow;
  layout: 'list' | 'grid';
  loading: boolean;
  failed: boolean;
  selected: boolean;
  onPress: (plant: PlantOption) => void;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  const { plant, status } = row;
  // Sin estado del servidor no se pinta ningún color de estado: solo se dice que no se sabe.
  const label =
    status?.label ?? (loading ? 'Consultando…' : failed ? 'Estado no disponible' : 'Sin estado');
  const tone = status ? toneDe(t)[status.tone] : { icon: t.integracion, text: t.textoSec };
  const icon = (status?.icon ?? 'help-circle-outline') as keyof typeof Ionicons.glyphMap;
  const grid = layout === 'grid';

  return (
    <Pressable
      onPress={() => onPress(plant)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      accessibilityLabel={`${plant.name}, ${label}${selected ? ', seleccionada' : ''}`}
      style={({ pressed }) => [
        grid ? styles.card : styles.row,
        selected && styles.itemSelected,
        pressed && !selected && styles.itemPressed,
      ]}
    >
      <View style={grid ? styles.cardText : styles.rowText}>
        <Text style={styles.itemName} numberOfLines={grid ? 2 : 1}>
          {plant.name}
        </Text>
        <View style={styles.statusLine}>
          <Ionicons name={icon} size={13} color={tone.icon} />
          <Text style={[styles.statusText, { color: tone.text }]} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
      {/* Ola decorativa del color del estado (oculta a lectores de pantalla); sin estado, gris. */}
      <View
        style={grid ? styles.cardWave : undefined}
        pointerEvents="none"
        aria-hidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg
          width={grid ? '100%' : 44}
          height={grid ? 16 : 22}
          viewBox={grid ? '0 0 140 16' : '0 0 44 22'}
          preserveAspectRatio="none"
        >
          {grid ? (
            <Path
              d="M0 8 Q17.5 2 35 8 T70 8 T105 8 T140 8 V16 H0 Z"
              fill={tone.icon}
              fillOpacity={0.3}
            />
          ) : (
            <>
              <Path
                d="M0 10 Q5.5 5 11 10 T22 10 T33 10 T44 10 V22 H0 Z"
                fill={tone.icon}
                fillOpacity={0.35}
              />
              <Path
                d="M0 14 Q5.5 9 11 14 T22 14 T33 14 T44 14 V22 H0 Z"
                fill={tone.icon}
                fillOpacity={0.6}
              />
            </>
          )}
        </Svg>
      </View>
    </Pressable>
  );
}

const useStyles = estilosConTema((t, nombre) => ({
  flex: { flex: 1 },
  screenRow: { flex: 1, flexDirection: 'row', backgroundColor: t.fondo },

  panel: {
    width: 264,
    backgroundColor: t.panel,
    borderRightWidth: 1,
    borderRightColor: t.divisor,
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  panelTitle: { fontFamily: Fonts.semibold, fontSize: 18, color: t.texto },
  panelCount: { fontFamily: Fonts.regular, fontSize: 13, color: t.textoSec, fontVariant: ['tabular-nums'] },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  triggerText: { fontFamily: Fonts.semibold, fontSize: 22, color: t.texto, flexShrink: 1 },

  backdrop: { backgroundColor: t.velo },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.panel,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: t.bordeHoja,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.bordeControl,
    alignSelf: 'center',
  },
  searchDialog: {
    width: 520,
    right: undefined,
    bottom: undefined,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.bordeSuave,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  sheetTitle: { fontFamily: Fonts.semibold, fontSize: 18, color: t.texto },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { flex: 1, gap: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: t.bordeControl,
    backgroundColor: t.superficie,
    paddingHorizontal: 12,
  },
  searchFocus: { borderColor: t.foco },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: t.texto,
    // El borde azul ya marca el foco; sin esto el navegador dibuja su propio anillo encima.
    ...(Platform.OS === 'web' ? { outlineStyle: 'solid', outlineWidth: 0 } : null),
  },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: t.bordeSuave,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: t.accion, borderColor: t.accion },
  chipText: { fontFamily: Fonts.medium, fontSize: 12, color: t.textoSec },
  chipTextOn: { color: t.sobreAccion },

  note: { fontFamily: Fonts.regular, fontSize: 13, color: t.textoSec, paddingVertical: 6 },

  list: { gap: 6, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.bordeFila,
    backgroundColor: t.fila,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  card: {
    width: '48.5%',
    minHeight: 76,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.bordeTarjeta,
    backgroundColor: t.superficie,
    overflow: 'hidden',
    ...sombraTarjeta(nombre),
  },
  cardText: { gap: 4 },
  cardWave: { position: 'absolute', left: 0, right: 0, bottom: 0 },

  itemSelected: { backgroundColor: t.seleccionado, borderColor: t.foco },
  itemPressed: { backgroundColor: t.pulsado },
  itemName: { fontFamily: Fonts.medium, fontSize: 14, color: t.texto },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontFamily: Fonts.regular, fontSize: 12, flexShrink: 1 },
}));
