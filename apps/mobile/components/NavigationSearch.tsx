import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Ionicons from './AppIcon';
import { router, type Href } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useWebEscape } from '../hooks/useWebEscape';
import { useReducedMotion } from '../hooks/useReducedMotion';
import Colors from '../constants/colors';
import { Fonts } from '../constants/fonts';

const B = Colors.brand;
export function NavigationSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { hasPermission } = useAuth();
  const wide = useWindowDimensions().width >= 900;
  const reduce = useReducedMotion();
  useWebEscape(open, () => setOpen(false));
  const destinations: { name: string; path: Href; icon: keyof typeof Ionicons.glyphMap }[] = [
    ...(hasPermission('view_dashboard')
      ? [
          { name: 'Tablero', path: '/(app)/tablero' as const, icon: 'grid-outline' as const },
          {
            name: 'Válvulas',
            path: '/(app)/electrovalvulas' as const,
            icon: 'options-outline' as const,
          },
          {
            name: 'Alertas y notificaciones',
            path: '/(app)/alertas' as const,
            icon: 'notifications-outline' as const,
          },
        ]
      : [
          {
            name: 'Estado de la planta',
            path: '/(app)/estado' as const,
            icon: 'pulse-outline' as const,
          },
        ]),
    ...(hasPermission('export_data')
      ? [
          {
            name: 'Informes y reportes',
            path: '/(app)/reportes' as const,
            icon: 'document-text-outline' as const,
          },
        ]
      : []),
    ...(hasPermission('manage_users')
      ? [{ name: 'Usuarios', path: '/(app)/usuarios' as const, icon: 'people-outline' as const }]
      : []),
    { name: 'Ajustes y perfil', path: '/(app)/ajustes', icon: 'settings-outline' },
  ];
  const normalized = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const results = destinations.filter((item) =>
    normalized(item.name).includes(normalized(query.trim())),
  );
  return (
    <>
      <Pressable
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Buscar sección"
        style={[styles.trigger, wide && styles.triggerWide]}
      >
        <Ionicons name="search-outline" color={B.textSecondary} size={20} />
        {wide && <Text style={styles.muted}>Buscar sección…</Text>}
      </Pressable>
      {open && (
        <Modal
          transparent
          visible
          animationType={reduce ? 'none' : 'fade'}
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.overlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar búsqueda"
            />
            <View
              style={styles.dialog}
              accessibilityViewIsModal
              role="dialog"
              aria-label="Buscar sección"
            >
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={22} color={B.link} />
                <TextInput
                  autoFocus
                  value={query}
                  onChangeText={setQuery}
                  accessibilityLabel="Nombre de la sección"
                  placeholder="¿A dónde quieres ir?"
                  placeholderTextColor={B.placeholder}
                  style={styles.input}
                />
                <Pressable
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar búsqueda"
                  style={styles.trigger}
                >
                  <Ionicons name="close" size={22} color={B.textSecondary} />
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                {results.length === 0 ? (
                  <Text style={styles.empty}>No hay secciones que coincidan con tu búsqueda.</Text>
                ) : (
                  results.map((item) => (
                    <Pressable
                      key={item.name}
                      onPress={() => {
                        setOpen(false);
                        router.push(item.path);
                      }}
                      accessibilityRole="button"
                      style={styles.result}
                    >
                      <Ionicons name={item.icon} size={20} color={B.link} />
                      <Text style={styles.name}>{item.name}</Text>
                      <Ionicons name="chevron-forward" size={18} color={B.textSecondary} />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

export function ProfileButton({ onPress }: { onPress: () => void }) {
  const { user } = useAuth();
  const wide = useWindowDimensions().width >= 1100;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Perfil y menú de ${user?.name ?? 'usuario'}`}
      style={styles.trigger}
    >
      <Ionicons name="person-circle-outline" size={28} color={B.link} />
      {wide && (
        <Text numberOfLines={1} style={styles.profileName}>
          {user?.name}
        </Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  trigger: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  triggerWide: {
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: B.cardBorder,
    borderRadius: 10,
  },
  muted: { fontFamily: Fonts.regular, fontSize: 13, color: B.textSecondary },
  profileName: { maxWidth: 130, fontFamily: Fonts.medium, fontSize: 13, color: B.text },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 80,
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: B.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: B.cardBorder,
    padding: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: B.divider,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: B.text,
  },
  result: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  name: { flex: 1, fontFamily: Fonts.medium, fontSize: 14, color: B.text },
  empty: { padding: 20, fontFamily: Fonts.regular, color: B.textSecondary },
});
