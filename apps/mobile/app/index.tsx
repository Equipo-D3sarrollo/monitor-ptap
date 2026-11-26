import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const { t } = useTheme();
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.antFondo }}>
        <ActivityIndicator size="large" color={t.antPrimario} />
      </View>
    );
  }

  if (!token) return <Redirect href="/(auth)/login" />;
  return <Redirect href={user?.role === 'civil' ? '/(app)/estado' : '/(app)/tablero'} />;
}
