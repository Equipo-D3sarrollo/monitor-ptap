import { Platform, Pressable, Text, View } from 'react-native';
import Ionicons from './AppIcon';
import { anilloFoco, enfocado, estilosConTema, useTheme } from '../context/ThemeContext';
import { opcionesDeTema } from '../services/theme-prefs';

/**
 * Apariencia, en Ajustes: la opción completa del tema. En web incluye «Según el sistema»; en Android
 * solo Oscuro y Claro hasta la próxima APK (ver services/theme-prefs.ts).
 *
 */
export function ThemePreferenceCard() {
  const { preferencia, setPreferencia, t } = useTheme();
  const styles = useStyles();
  const opciones = opcionesDeTema(Platform.OS);
  return (
    <View style={styles.card} role="radiogroup" aria-label="Tema de la aplicación">
      {opciones.map((o, i) => {
        const on = o.id === preferencia;
        return (
          <Pressable
            key={o.id}
            onPress={() => setPreferencia(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            style={(estado) => [
              styles.row,
              i > 0 && styles.rowDivider,
              enfocado(estado) && anilloFoco(t),
            ]}
          >
            <Ionicons
              name={on ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={on ? t.enlace : t.antTextoSec}
            />
            <Text style={styles.label}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
      <Text style={styles.hint}>
        {Platform.OS === 'web'
          ? 'Se guarda en este navegador. «Según el sistema» sigue el modo claro u oscuro del equipo.'
          : 'Se guarda en este dispositivo.'}
      </Text>
    </View>
  );
}

const useStyles = estilosConTema((t) => ({
  card: {
    backgroundColor: t.antSuperficie,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: t.bordeSuave,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderRadius: 8 },
  rowDivider: { borderTopWidth: 1, borderTopColor: t.antDivisor },
  label: { fontSize: 14, color: t.antTexto },
  hint: { fontSize: 11.5, color: t.antTextoSec, lineHeight: 16, paddingVertical: 10 },
}));
