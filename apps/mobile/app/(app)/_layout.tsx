import { useMemo, useState } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import { PlatformPressable } from 'expo-router/react-navigation';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { Fonts, usePoppins } from '../../constants/fonts';
import { useAuth } from '../../context/AuthContext';
import { usePlant } from '../../context/PlantContext';
import { useUnseenNotifications } from '../../hooks/useNotifications';
import { NotificationOptIn } from '../../components/NotificationOptIn';
import { usePendingUsers } from '../../hooks/usePendingUsers';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ROLE_LABELS, ROLE_COLORS, type AuthUser } from '@ptap/shared';

const B = Colors.brand;
/** Desde este ancho las pestañas pasan a una barra lateral (como el panel de plantas del tablero). */
const SIDEBAR_MIN_WIDTH = 1024;

/**
 * Título de la cabecera: "Aquora · planta". Aislado para que el cambio de planta repinte solo este
 * texto y no las opciones de las 7 pestañas. Sin el logo: a la altura de la cabecera sus letras son
 * ilegibles y repetían "Aquora"; el logo va en el encabezado con agua del tablero.
 */
function HeaderTitle() {
  const { selectedPlant } = usePlant();
  return (
    <View
      style={styles.titleRow}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Aquora, planta ${selectedPlant.name}`}
    >
      <Text style={styles.titleBrand}>Aquora</Text>
      <Text style={styles.titlePlant} numberOfLines={1}>
        · {selectedPlant.name}
      </Text>
    </View>
  );
}

/**
 * Campana de notificaciones AISLADA.
 *
 * Cuenta avisos **NO VISTOS**, no alertas activas. Es la diferencia que pidió operación: la
 * campana se apaga cuando alguien los mira, no cuando el problema se resuelve — un sensor caído
 * hace 15 días deja de gritar en rojo una vez leído, pero sigue en el historial.
 *
 * Vive en su propia hoja para que su sondeo no repinte la cáscara de pestañas entera, igual que
 * el `<Clock />` de `tablero.tsx`.
 */
function AlertBell() {
  const unseen = useUnseenNotifications();
  return (
    <TouchableOpacity
      style={{ marginRight: 16 }}
      hitSlop={8}
      onPress={() => router.push('/(app)/alertas')}
      accessibilityRole="button"
      accessibilityLabel={
        unseen > 0 ? `Notificaciones: ${unseen > 9 ? '9+' : unseen} sin ver` : 'Notificaciones: ninguna sin ver'
      }
    >
      <View>
        <Ionicons name="notifications-outline" size={24} color={B.text} aria-hidden />
        {unseen > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifText}>{unseen > 9 ? '9+' : unseen}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Botón de menú aislado: `usePendingUsers` sondea cada 60 s y no debe repintar la cáscara. */
function MenuButton({ onPress }: { onPress: () => void }) {
  const { count } = usePendingUsers();
  return (
    <TouchableOpacity
      style={{ marginLeft: 16 }}
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Menú. ${count} cuentas pendientes de aprobar` : 'Menú'}
    >
      <View>
        <Ionicons name="menu" size={24} color={B.text} />
        {/* Punto de aviso: hay cuentas pendientes de aprobar (solo lo ve un admin). */}
        {count > 0 && (
          <View style={styles.menuDot}>
            <Text style={styles.notifText}>{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function MenuModal({
  visible,
  onClose,
  user,
}: {
  visible: boolean;
  onClose: () => void;
  user: AuthUser | null;
}) {
  const { logout, hasPermission } = useAuth();
  const { count: pendingCount } = usePendingUsers();

  async function handleLogout() {
    onClose();
    await logout();
    router.replace('/(auth)/login');
  }

  function goToUsers() {
    onClose();
    router.push('/(app)/usuarios');
  }

  function goToSettings() {
    onClose();
    router.push('/(app)/ajustes');
  }

  function goToAlerts() {
    onClose();
    router.push('/(app)/alertas');
  }

  const roleColor = user ? ROLE_COLORS[user.role] : Colors.primary;

  const reducedMotion = useReducedMotion();

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar el menú"
      >
        <Pressable
          style={styles.drawer}
          onPress={() => {}}
          // Aísla el menú del resto del árbol para los lectores de pantalla mientras está abierto.
          accessibilityViewIsModal
          accessibilityRole="menu"
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerAvatar}>
              <Ionicons name="person" size={28} color="#fff" />
            </View>
            <Text style={styles.drawerTitle}>{user?.name ?? 'Usuario'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '30' }]}>
              <Text style={[styles.roleText, { color: '#fff' }]}>
                {user ? ROLE_LABELS[user.role] : '—'}
              </Text>
            </View>
            <Text style={styles.drawerSubtitle}>{user?.plant ?? 'Sistema de Monitoreo'}</Text>
          </View>

          {/* Solo Admin: la matriz oficial reserva la gestión de usuarios al Administrador.
              Ocultarlo es comodidad de UI — el backend igual responde 403 a los demás. */}
          {hasPermission('manage_users') && (
            <TouchableOpacity style={styles.drawerItem} onPress={goToUsers}>
              <Ionicons name="people-outline" size={20} color={Colors.textPrimary} />
              <Text style={styles.drawerItemText}>Usuarios</Text>
              {pendingCount > 0 && (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>
                    {pendingCount > 9 ? '9+' : pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.drawerItem} onPress={goToSettings}>
            <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.drawerItemText}>Ajustes</Text>
          </TouchableOpacity>

          {/* Alertas REALES (derivadas del snapshot): solo tienen sentido para roles que ven el
              tablero. El Civil (solo estado básico) no recibe señales, así que no se le ofrece. */}
          {hasPermission('view_dashboard') && (
            <TouchableOpacity style={styles.drawerItem} onPress={goToAlerts}>
              <Ionicons name="notifications-outline" size={20} color={Colors.textPrimary} />
              <Text style={styles.drawerItemText}>Alertas</Text>
            </TouchableOpacity>
          )}

          <View style={styles.drawerDivider} />

          <TouchableOpacity style={styles.drawerLogout} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.drawerLogoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function AppLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const { user, token, isLoading } = useAuth();
  // Poppins para los componentes del tablero; si falla la carga se sigue con la fuente del sistema.
  const [fontsLoaded, fontError] = usePoppins();
  const isCivil = user?.role === 'civil';
  const sidebar = useWindowDimensions().width >= SIDEBAR_MIN_WIDTH;

  // Opciones de cabecera ESTABLES: se esparcen en 7 `Tabs.Screen`, así que recrearlas en cada
  // render obligaba a react-navigation a re-evaluar las 7. `setMenuVisible` es estable (useState),
  // y los conteos viven ahora dentro de `<AlertBell/>` y `<MenuButton/>`, no aquí. La planta vive
  // dentro de `<HeaderTitle/>` por la misma razón. Las pantallas con título propio (Alertas,
  // Usuarios…) lo sobrescriben con `headerTitle: 'texto'` y heredan el estilo.
  const HEADER_OPTS = useMemo(
    () => ({
      headerStyle: { backgroundColor: B.panel, borderBottomWidth: 1, borderBottomColor: B.divider },
      headerShadowVisible: false,
      headerTintColor: B.text,
      headerTitleAlign: 'left' as const,
      headerTitle: () => <HeaderTitle />,
      headerTitleStyle: { fontFamily: Fonts.semibold, fontSize: 17, color: B.text },
      headerLeft: () => <MenuButton onPress={() => setMenuVisible(true)} />,
      headerRight: () => <AlertBell />,
    }),
    [],
  );

  // GUARD de sesión para TODAS las rutas de (app). Cubre tres caminos al login:
  //  1. Recargar la página en una ruta profunda (/sensores, /ajustes…) sin sesión — antes la
  //     pantalla se renderizaba igual (solo index.tsx redirigía) y quedaba rota a punta de 401.
  //  2. El cierre AUTOMÁTICO a las 8 h (AuthContext vence el token y deja token=null).
  //  3. Un 401 del backend (token revocado/vencido): onUnauthorized hace logout y esto redirige.
  // Mientras se restaura la sesión persistida no se decide nada (evita el parpadeo al login).
  if (isLoading || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: B.page }}>
        <ActivityIndicator size="large" color={B.blue} />
      </View>
    );
  }
  if (!token) return <Redirect href="/(auth)/login" />;

  return (
    <>
      {/* La franja de permiso vive AQUÍ, no en Ajustes. El permiso del sistema no se puede pedir
          solo —los navegadores lo rechazan y Android lo cuenta como denegado para siempre—, así que
          hace falta un gesto del usuario; y hasta ahora ese gesto solo era posible si alguien
          entraba a Ajustes y encontraba la tarjeta. Quien no lo hiciera no recibía un solo aviso en
          el móvil sin manera de enterarse. Montarla en la cáscara también registra la tarea de
          fondo (`useDeviceNotifications`), que era el otro motivo por el que casi nadie los recibía. */}
      <NotificationOptIn />
      {/* Montado solo mientras está abierto: un `<Modal visible={false}>` monta igual su subárbol,
          y con él un segundo observador de `usePendingUsers` que re-renderizaba el cajón cerrado
          cada 60 s. El badge del botón de menú sigue vivo por su cuenta. */}
      {menuVisible && <MenuModal visible onClose={() => setMenuVisible(false)} user={user} />}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: B.link,
          tabBarInactiveTintColor: B.textSecondary,
          // Escritorio: barra lateral de 76 px con la pestaña activa resaltada (referencia
          // TableroEscritorio). Celular: barra inferior.
          tabBarPosition: sidebar ? 'left' : 'bottom',
          tabBarVariant: sidebar ? 'material' : 'uikit',
          tabBarLabelPosition: 'below-icon',
          tabBarActiveBackgroundColor: sidebar ? B.selected : undefined,
          tabBarStyle: isCivil
            ? { display: 'none' }
            : sidebar
              ? styles.rail
              : styles.bottomBar,
          tabBarItemStyle: sidebar ? styles.railItem : styles.bottomItem,
          // Celular: raya azul de 2 px arriba de la pestaña activa (referencia TableroMovil). Es el
          // mismo botón que pinta la barra por defecto; solo se le añade el borde según aria-selected.
          tabBarButton: sidebar
            ? undefined
            : ({ style, ...props }) => (
                <PlatformPressable
                  {...props}
                  style={[style, styles.tabTop, props['aria-selected'] && styles.tabTopActive]}
                />
              ),
          tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16 },
        }}
      >
        <Tabs.Screen
          name="tablero"
          options={{
            ...HEADER_OPTS,
            tabBarLabel: 'Tablero',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={size}
                color={typeof color === 'string' ? color : Colors.primary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="electrovalvulas"
          options={{
            ...HEADER_OPTS,
            tabBarLabel: 'Válvulas',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'toggle' : 'toggle-outline'}
                size={size}
                color={typeof color === 'string' ? color : Colors.primary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="reportes"
          options={{
            ...HEADER_OPTS,
            tabBarLabel: 'Reportes',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={size}
                color={typeof color === 'string' ? color : Colors.primary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="estado"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            ...HEADER_OPTS,
            headerTitle: 'Estado General',
          }}
        />
        {/* Fuera del tab bar: se entra desde el menú/campana. Solo roles con view_dashboard. */}
        <Tabs.Screen
          name="alertas"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            ...HEADER_OPTS,
            headerTitle: 'Alertas',
          }}
        />
        {/* Fuera del tab bar: se entra desde el menú, y solo si el rol tiene manage_users. */}
        <Tabs.Screen
          name="usuarios"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            ...HEADER_OPTS,
            headerTitle: 'Usuarios',
          }}
        />
        {/* Fuera del tab bar: se entra desde el menú. Disponible para todos los roles. */}
        <Tabs.Screen
          name="ajustes"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            ...HEADER_OPTS,
            headerTitle: 'Ajustes',
          }}
        />
        {/* Fuera del tab bar: se entra desde Ajustes, y el backend solo la sirve con
            `system_config`. La pantalla vuelve a comprobarlo por su cuenta. */}
        <Tabs.Screen
          name="desarrollador"
          options={{
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
            ...HEADER_OPTS,
            headerTitle: 'Modo desarrollador',
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  titleBrand: { fontFamily: Fonts.semibold, fontSize: 17, color: B.text },
  titlePlant: { fontFamily: Fonts.regular, fontSize: 15, color: B.textSecondary, flexShrink: 1 },
  // 96 px: con menos, el ítem de la barra lateral deja ~43 px a la etiqueta y "Válvulas" se corta.
  rail: {
    width: 96,
    backgroundColor: B.panel,
    borderRightWidth: 1,
    borderRightColor: B.divider,
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  railItem: { borderRadius: 12, marginVertical: 3, minHeight: 60, paddingHorizontal: 0 },
  bottomItem: { height: 58 },
  tabTop: { borderTopWidth: 2, borderTopColor: 'transparent' },
  tabTopActive: { borderTopColor: B.blue },
  // Poppins es más alta que la fuente del sistema: con el alto por defecto la etiqueta quedaba
  // aplastada a 9 px y cortada abajo.
  bottomBar: {
    backgroundColor: B.panel,
    borderTopColor: B.divider,
    elevation: 0,
    shadowOpacity: 0,
    height: 66,
    paddingTop: 4,
    paddingBottom: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
  },
  drawer: {
    width: 280,
    backgroundColor: Colors.bg,
    paddingBottom: 32,
  },
  drawerHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  drawerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  drawerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  drawerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerLogoutText: {
    fontSize: 15,
    color: Colors.danger,
    fontWeight: '600',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  menuDot: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  pendingPill: {
    marginLeft: 'auto',
    backgroundColor: Colors.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
