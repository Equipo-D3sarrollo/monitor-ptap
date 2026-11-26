import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from './AppIcon';
import { useDeviceNotifications } from '../hooks/useDeviceNotifications';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * Franja que pide el permiso de notificaciones del sistema.
 *
 * Existe porque el permiso NO se puede pedir solo. Los navegadores rechazan una petición automática
 * y Android la cuenta como denegada — y una vez denegada, volver a pedirla ya no muestra el diálogo
 * nunca más. Hace falta un gesto del usuario, y por tanto un botón.
 *
 * Y hace falta que ese botón se VEA. Hasta ahora la única forma de conceder el permiso era entrar a
 * Ajustes y encontrar la tarjeta: quien no lo hiciera no recibía un solo aviso en el móvil, y no
 * tenía manera de enterarse de que existía la opción. Por eso esto vive en la cáscara de la app.
 *
 * Se muestra SOLO cuando el permiso está sin decidir. Concedido desaparece; denegado también —
 * insistir no lo reabre y solo estorbaría, así que en ese caso se explica en Ajustes cómo
 * reactivarlo desde el sistema operativo.
 */
export function NotificationOptIn() {
  const { t } = useTheme();
  const styles = useStyles();
  const { supported, permission, ask } = useDeviceNotifications();
  const [oculto, setOculto] = useState(false);

  if (!supported || permission !== 'undetermined' || oculto) return null;

  return (
    <View style={styles.barra} accessibilityRole="alert">
      <Ionicons name="notifications-outline" size={20} color={t.antPrimario} />
      <View style={styles.texto}>
        <Text style={styles.titulo}>Recibe los avisos aunque la app esté cerrada</Text>
        <Text style={styles.detalle}>
          Solo de tu planta. Te avisamos de tanques bajos, sensores caídos y señales fuera de rango.
        </Text>
      </View>
      <View style={styles.acciones}>
        <TouchableOpacity
          style={styles.activar}
          onPress={() => void ask()}
          accessibilityRole="button"
          accessibilityLabel="Activar las notificaciones en este dispositivo"
        >
          <Text style={styles.activarTexto}>Activar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setOculto(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Ahora no. Podrás activarlo desde Ajustes."
        >
          <Text style={styles.ahoraNo}>Ahora no</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = estilosConTema((t) => ({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.antPrimario + '14',
    borderBottomWidth: 1,
    borderBottomColor: t.antPrimario + '33',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  texto: { flex: 1, gap: 2 },
  titulo: { fontSize: 14, fontWeight: '700', color: t.antTexto },
  detalle: { fontSize: 12, lineHeight: 16, color: t.antTextoSec },
  acciones: { alignItems: 'flex-end', gap: 4 },
  activar: {
    // Texto blanco: sobre `accion` (5,5:1), no sobre el `primary` anterior (3,7:1). Ver D1.
    backgroundColor: t.accion,
    paddingHorizontal: 14,
    // 44 px de alto: es un objetivo táctil, y se usa con guantes en planta.
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 92,
    alignItems: 'center',
  },
  activarTexto: { fontSize: 14, fontWeight: '700', color: t.sobreAccion },
  ahoraNo: { fontSize: 11, color: t.antTextoSec, paddingVertical: 4 },
}));
