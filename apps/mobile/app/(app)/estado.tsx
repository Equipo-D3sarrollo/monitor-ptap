import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '../../components/AppIcon';
import { useBasicStatus } from '../../hooks/useBasicStatus';
import { PLANTS } from '../../context/PlantContext';
import { useAuth } from '../../context/AuthContext';
// El veredicto «¿el sistema funciona?» vive en el servicio, junto al badge del tablero: las dos
// pantallas tienen que decir lo mismo de la misma planta, también si está en integración.
import { systemHealth } from '../../services/plant-status';
import { estilosConTema, useTheme } from '../../context/ThemeContext';

export default function EstadoScreen() {
  const { t } = useTheme();
  const styles = useStyles();
  const { user } = useAuth();
  const plantId = user?.plant ?? 'montebello';
  const plantName = PLANTS.find((p) => p.id === plantId)?.name ?? plantId;

  // Estado BÁSICO (no el snapshot detallado): la matriz oficial concede al Civil solo
  // "¿el sistema funciona?" y "¿hay agua?". El veredicto del agua lo deriva el backend, que
  // es quien tiene las lecturas de tanque — aquí nunca llegan valores crudos del PLC.
  const { data: status } = useBasicStatus(plantId);
  const system = systemHealth(status?.bridgeStatus, status?.liveness?.state ?? 'frozen', status?.integrationPending === true);

  const water =
    status?.waterAvailable === true
      ? { icon: 'water' as const, color: t.antPrimarioClaro, title: 'Agua disponible', desc: 'Los tanques de la planta tienen nivel suficiente.' }
      : status?.waterAvailable === false
        ? { icon: 'water-outline' as const, color: t.antAdvertencia, title: 'Nivel bajo de agua', desc: 'Los tanques están por debajo del nivel mínimo.' }
        : { icon: 'help-circle-outline' as const, color: t.antNeutro, title: 'Sin datos de tanques', desc: 'Esta planta aún no tiene señales de tanque mapeadas.' };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Estado General del Sistema</Text>
        <Text style={styles.subheading}>{plantName}</Text>

        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: system.color + '20' }]}>
            <Ionicons name={system.icon} size={52} color={system.color} />
          </View>
          <Text style={styles.statusTitle}>{system.title}</Text>
          <Text style={styles.statusDesc}>{system.desc}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: water.color + '20' }]}>
            <Ionicons name={water.icon} size={52} color={water.color} />
          </View>
          <Text style={styles.statusTitle}>{water.title}</Text>
          <Text style={styles.statusDesc}>{water.desc}</Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={t.antTextoSec} />
          <Text style={styles.infoText}>
            Acceso con vista básica. Contacte a un operador para información detallada.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = estilosConTema((t) => ({
  safe: { flex: 1, backgroundColor: t.antSuperficiePagina },
  content: { padding: 20 },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: t.antTexto,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: t.antTextoSec,
    marginBottom: 24,
  },
  card: {
    backgroundColor: t.antFondoTarjeta,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: t.bordeSuave,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: t.antTexto,
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: t.antTextoSec,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: t.antFondo,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: t.bordeSuave,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: t.antTextoSec,
    lineHeight: 18,
  },
}));
