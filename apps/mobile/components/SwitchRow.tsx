import { View, Text, Switch, Pressable } from 'react-native';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * Fila con interruptor: título, explicación y `Switch`.
 *
 * Existe para que toda la fila sea pulsable, no solo el interruptor. Es la primera pantalla de la
 * app con interruptores y se usa en planta, a veces con guantes: un objetivo táctil de 40 px en el
 * borde derecho se falla, y un ajuste que no responde al primer toque se acaba tocando tres veces
 * —dejándolo como estaba—.
 */
export function SwitchRow({
  titulo,
  detalle,
  valor,
  onChange,
  disabled,
}: {
  titulo: string;
  detalle?: string;
  valor: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      style={({ pressed }) => [styles.fila, pressed && !disabled && styles.pulsada]}
      onPress={() => !disabled && onChange(!valor)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valor, disabled: Boolean(disabled) }}
      accessibilityLabel={titulo}
      accessibilityHint={detalle}
    >
      <View style={styles.texto}>
        <Text style={styles.titulo}>{titulo}</Text>
        {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onChange}
        disabled={disabled}
        // El interruptor NO captura el toque: la fila entera ya lo maneja, y dejar los dos activos
        // provocaba dobles disparos que dejaban el valor sin cambiar.
        pointerEvents="none"
        trackColor={{ false: t.antDivisor, true: t.antPrimario + '99' }}
        thumbColor={valor ? t.antPrimario : t.antTextoSec}
      />
    </Pressable>
  );
}

const useStyles = estilosConTema((t) => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // 48 px de alto mínimo: es un objetivo táctil de verdad.
    minHeight: 48,
    paddingVertical: 10,
  },
  pulsada: { opacity: 0.6 },
  texto: { flex: 1, gap: 2 },
  titulo: { fontSize: 14, fontWeight: '600', color: t.antTexto },
  detalle: { fontSize: 12, lineHeight: 16, color: t.antTextoSec },
}));
