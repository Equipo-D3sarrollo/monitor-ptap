import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from './AppIcon';
import Colors from '../constants/colors';
import { anilloFoco, enfocado, useTheme } from '../context/ThemeContext';
import { opcionesDeTema } from '../services/theme-prefs';

/**
 * Apariencia, en Ajustes: la opción completa del tema. En web incluye «Según el sistema»; en Android
 * solo Oscuro y Claro hasta la próxima APK (ver services/theme-prefs.ts).
 *
 * Usa todavía los colores de Ajustes (paleta anterior): se migra junto con esa pantalla.
 */
export function ThemePreferenceCard() {
  const { preferencia, setPreferencia, t } = useTheme();
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
              color={on ? Colors.brand.link : Colors.textSecondary}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.brand.cardBorder,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderRadius: 8 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.divider },
  label: { fontSize: 14, color: Colors.textPrimary },
  hint: { fontSize: 11.5, color: Colors.textSecondary, lineHeight: 16, paddingVertical: 10 },
});
