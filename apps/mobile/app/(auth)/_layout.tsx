import { Slot, Stack, Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AuthLayout() {
  const { token, user, isLoading } = useAuth();
  const { nombre } = useTheme();

  // Guard inverso al de (app): con una sesión VIVA, caer en /login o /register (historial del
  // navegador, enlace guardado) devuelve a la app — la sesión persiste hasta sus 8 h y solo el
  // logout (manual o por expiración) muestra el login de nuevo.
  if (!isLoading && token) {
    return <Redirect href={user?.role === 'civil' ? '/(app)/estado' : '/(app)/tablero'} />;
  }

  if (Platform.OS === 'web') return <Slot />;

  return (
    <>
      {/* La zona de la barra de estado se pinta con el fondo del tema (registro no tiene panel de
          marca arriba): íconos oscuros en claro. */}
      <StatusBar style={nombre === 'claro' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
}
