import { memo } from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { usePlant, PLANTS } from '../context/PlantContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Selector de planta. Solo aparece para quien puede cambiar de planta (permiso
 * `view_all_plants`, hoy solo Admin): un operador está vinculado a UNA planta, así que
 * ofrecerle las demás sería enseñarle puertas que el backend cierra con 403. Las pantallas
 * muestran el nombre de la planta en su propia cabecera, así que no se pierde información.
 */
function PlantSelectorBase() {
  const { t } = useTheme();
  const { selectedPlant, setSelectedPlant, canSwitchPlant } = usePlant();

  if (!canSwitchPlant) return null;

  return (
    <View style={{ backgroundColor: t.antFondo, borderBottomWidth: 1, borderBottomColor: t.antDivisor }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {PLANTS.map((plant) => {
          const isSelected = plant.id === selectedPlant.id;
          return (
            <TouchableOpacity
              key={plant.id}
              onPress={() => setSelectedPlant(plant)}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar planta ${plant.name}`}
              accessibilityState={{ selected: isSelected }}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: isSelected ? t.accion : 'transparent', // D1: texto blanco sobre `accion` (5,5:1), no sobre `primary` (3,7:1)
                borderWidth: 1.5,
                borderColor: isSelected ? t.accion : t.antTextoSec + '55',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? t.sobreAccion : t.antTextoSec,
                }}
              >
                {plant.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Sin props: solo se re-renderiza cuando cambia el PlantContext (que ya está memoizado). */
export const PlantSelector = memo(PlantSelectorBase);
