import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from './WaterVector';
import { anilloFoco, enfocado, useTheme } from '../context/ThemeContext';

/**
 * Sol y luna dibujados con `Path`, no con Ionicons: `sunny`/`moon` no están en el subconjunto de
 * la fuente web (ionicons-used.json), y usarlos haría que el navegador bajara la fuente completa
 * en cada carga solo por este botón.
 */
const SOL =
  'M12 7.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9Z' +
  'M19.2 13L22 13L22 11L19.2 11ZM16.38 17.8L18.36 19.78L19.78 18.36L17.8 16.38Z' +
  'M11 19.2L11 22L13 22L13 19.2ZM6.2 16.38L4.22 18.36L5.64 19.78L7.62 17.8Z' +
  'M4.8 11L2 11L2 13L4.8 13ZM7.62 6.2L5.64 4.22L4.22 5.64L6.2 7.62Z' +
  'M13 4.8L13 2L11 2L11 4.8ZM17.8 7.62L19.78 5.64L18.36 4.22L16.38 6.2Z';
const LUNA = 'M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a8.5 8.5 0 1 0 10.8 10.8Z';

/**
 * Botón de la barra superior (a la izquierda de la campana): pasa al otro tema. Muestra el tema AL
 * QUE SE VA (sol = «pasar a claro»), que es la convención más extendida, y lo dice en su etiqueta.
 * La opción completa (incluida «Según el sistema» en web) está en Ajustes.
 */
function ThemeToggleBase({ color }: { color: string }) {
  const { nombre, alternar, t } = useTheme();
  const aClaro = nombre === 'oscuro';
  return (
    <Pressable
      onPress={alternar}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={aClaro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      style={(estado) => [styles.boton, enfocado(estado) && anilloFoco(t)]}
    >
      <View pointerEvents="none">
        <Svg width={22} height={22} viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
          <Path d={aClaro ? SOL : LUNA} fill={color} />
        </Svg>
      </View>
    </Pressable>
  );
}

export const ThemeToggle = memo(ThemeToggleBase);

const styles = StyleSheet.create({
  boton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
