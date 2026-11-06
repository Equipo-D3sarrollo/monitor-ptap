import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppUpdateBanner } from '../../components/AppUpdateBanner';
import { WaterBackground } from '../../components/WaterBackground';
import { LogoRipples } from '../../components/LogoRipples';
import { useAuth } from '../../context/AuthContext';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { checkServerHealth } from '../../services/api';
import { runningVersion } from '../../services/app-release';
import { apiLogin } from '../../services/auth';
import { validateLogin, type LoginFieldErrors } from '../../services/login-validation';
import { toast } from '../../services/toast-store';
import Colors from '../../constants/colors';
import { Fonts, usePoppins } from '../../constants/fonts';

const L = Colors.login;
/** Desde este ancho el login usa dos columnas (panel de agua + formulario). */
const WIDE_BREAKPOINT = 900;
/** Fracción del panel izquierdo que cubre el agua en escritorio. */
const WIDE_WATER_LEVEL = 0.34;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  // `disabled` del botón llega un render tarde: dos Enter seguidos mandaban dos logins.
  const submitting = useRef(false);
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const [fontsLoaded, fontError] = usePoppins();
  const reduce = useReduceMotion();
  const appear = useRef(new Animated.Value(0)).current;
  // null = comprobando. Nunca se asume "en línea" sin respuesta real del backend.
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    checkServerHealth().then(ok => alive && setServerUp(ok));
    return () => {
      alive = false;
    };
  }, []);

  // El formulario entra con fade + subida de 16 px mientras el agua sube.
  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      appear.setValue(1);
      return;
    }
    const anim = Animated.timing(appear, {
      toValue: 1,
      duration: 700,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [reduce, appear]);

  async function handleLogin() {
    if (submitting.current) return;
    const found = validateLogin(email, password);
    setErrors(found);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    submitting.current = true;
    setIsLoading(true);
    try {
      const { token, user } = await apiLogin(email.trim(), password);
      await login(token, user);
      router.replace(user.role === 'civil' ? '/(app)/estado' : '/(app)/tablero');
    } catch (err) {
      // Mostrar el motivo REAL: un servidor caído o un rate-limit no son una contraseña mala.
      // Decir siempre "credenciales inválidas" manda a la gente a revisar lo que no falla.
      toast.error('Error de acceso', err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }

  // Poppins carga en milisegundos desde el paquete; si falla, se sigue con la fuente del sistema.
  if (!fontsLoaded && !fontError) return <View style={styles.safe} />;

  const version = runningVersion();
  const serverLabel =
    serverUp === null
      ? 'Comprobando el servidor…'
      : serverUp
        ? 'Servidor en línea'
        : 'Sin conexión con el servidor';

  const form = (
    <Animated.View
      style={[
        styles.form,
        {
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <Text style={styles.title} accessibilityRole="header">
        Ingresa a Aquora
      </Text>
      <View style={styles.brandBar} accessible={false}>
        <View style={[styles.brandSeg, { flex: 55, backgroundColor: L.brandBlue }]} />
        <View style={[styles.brandSeg, { flex: 30, backgroundColor: L.telcobrasGreen }]} />
        <View style={[styles.brandSeg, { flex: 15, backgroundColor: L.brandYellow }]} />
      </View>
      <Text style={styles.subtitle}>Acceso para operadores y personal autorizado.</Text>

      <Field
        ref={emailRef}
        label="Correo electrónico"
        icon="mail-outline"
        error={errors.email}
        value={email}
        onChangeText={v => {
          setEmail(v);
          if (errors.email) setErrors(e => ({ ...e, email: undefined }));
        }}
        placeholder="nombre@empresa.co"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={255}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <Field
        ref={passwordRef}
        label="Contraseña"
        icon="lock-closed-outline"
        error={errors.password}
        value={password}
        onChangeText={v => {
          setPassword(v);
          if (errors.password) setErrors(e => ({ ...e, password: undefined }));
        }}
        secureTextEntry={!showPassword}
        autoComplete="current-password"
        textContentType="password"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={200}
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        accessory={
          <Pressable
            onPress={() => setShowPassword(v => !v)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={L.textSecondary}
            />
          </Pressable>
        }
      />

      <Pressable
        onPress={handleLogin}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading, disabled: isLoading }}
        // react-native-web 0.21 ya no traduce accessibilityState: los aria-* cubren la web.
        aria-busy={isLoading}
        aria-disabled={isLoading}
        style={({ pressed }) => [
          styles.btnPrimary,
          (pressed || isLoading) && { backgroundColor: L.buttonPressed },
        ]}
      >
        {isLoading && <ActivityIndicator color={L.buttonText} />}
        <Text style={styles.btnPrimaryText}>{isLoading ? 'Ingresando…' : 'Ingresar'}</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          // No hay endpoint de recuperación de contraseña: el acceso lo restablece un administrador.
          toast.info('¿Problemas para ingresar?', 'Contacta al administrador de Aquora para recuperar tu acceso.')
        }
        accessibilityRole="button"
        style={styles.linkTap}
      >
        <Text style={styles.linkMuted}>¿Problemas para ingresar?</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* El alta crea SIEMPRE una cuenta Civil (solo consulta); elevar el rol es
          potestad de un administrador. Ver app/(auth)/register.tsx. */}
      <View style={styles.registerRow}>
        <Text style={styles.registerText}>¿Aún no tienes cuenta?</Text>
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          accessibilityRole="link"
          style={styles.linkTap}
        >
          <Text style={styles.linkGreen}>Solicitar acceso</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Las cuentas nuevas son de consulta hasta que un administrador las apruebe.
      </Text>

      {/* En WEB ofrece descargar la app (mismo gesto que "crear cuenta nueva"); en la APK avisa
          si la instalada se quedó atrás. El propio componente decide cuál aplica y si mostrarse
          — aquí no hace falta ramificar por plataforma. */}
      <AppUpdateBanner modo="descarga" />
      <AppUpdateBanner modo="actualizacion" />

      <View style={styles.footer} accessible accessibilityLabel={serverLabel}>
        <View
          style={[
            styles.dot,
            { backgroundColor: serverUp ? L.telcobrasGreen : L.placeholder },
          ]}
        />
        <Text style={styles.footerText}>
          {serverLabel}
          {version ? ` · v${version}` : ''}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {isWide ? (
          <View style={styles.wideRow}>
            {/* El logo y la frase se centran en la parte seca, por encima del agua. */}
            <View style={[styles.wideWater, { paddingBottom: height * WIDE_WATER_LEVEL }]}>
              <WaterBackground level={WIDE_WATER_LEVEL} />
              <LogoRipples width={200} />
              <Text style={styles.tagline}>El agua de 12 plantas, en una sola pantalla.</Text>
              <Text style={styles.taglineSub}>
                Caudal, presión, niveles y calidad del agua en tiempo real.
              </Text>
            </View>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.wideFormScroll}
              keyboardShouldPersistTaps="handled"
            >
              {form}
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.narrowScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.narrowWater}>
              <WaterBackground level={0.2} />
              <LogoRipples width={152} />
            </View>
            <View style={styles.narrowForm}>{form}</View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  /** Elemento a la derecha del campo (el ojo de la contraseña). */
  accessory?: ReactNode;
}

/** Campo con etiqueta, icono y tres estados: normal, foco (borde azul + halo) y error. */
const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, icon, error, accessory, onFocus, onBlur, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {/* El halo es un anillo exterior siempre presente (transparente sin foco): así el foco no
          mueve el diseño, y se ve igual en iOS, Android y web. */}
      <View style={[styles.halo, focused && !error && { borderColor: L.focusHalo }]}>
        <View
          style={[
            styles.inputRow,
            focused && { borderColor: L.fieldBorderFocus },
            !!error && { borderColor: Colors.danger },
          ]}
        >
          <Ionicons name={icon} size={20} color={L.textSecondary} />
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={L.placeholder}
            accessibilityLabel={label}
            aria-invalid={!!error}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...input}
          />
          {accessory}
        </View>
      </View>
      {/* Siempre montado para que el lector de pantalla anuncie el mensaje al aparecer. */}
      <Text style={styles.fieldError} accessibilityLiveRegion="polite" aria-live="polite">
        {error ?? ''}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: L.pageBg },
  flex: { flex: 1 },

  // Escritorio/tablet: panel de agua a la izquierda, formulario centrado a la derecha.
  wideRow: { flex: 1, flexDirection: 'row' },
  wideWater: {
    flex: 1,
    backgroundColor: L.waterPanel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    overflow: 'hidden',
  },
  wideFormScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  tagline: {
    marginTop: 28,
    fontFamily: Fonts.semibold,
    fontSize: 26,
    lineHeight: 36,
    color: L.text,
    textAlign: 'center',
    maxWidth: 440,
  },
  taglineSub: {
    marginTop: 10,
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: L.textSecondary,
    textAlign: 'center',
    maxWidth: 440,
  },

  // Celular: zona del logo (~330 px) arriba y formulario debajo con 24 px de margen.
  narrowScroll: { flexGrow: 1 },
  narrowWater: {
    height: 330,
    backgroundColor: L.waterPanel,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 56,
    overflow: 'hidden',
  },
  narrowForm: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },

  form: { width: '100%', maxWidth: 400 },
  title: { fontFamily: Fonts.semibold, fontSize: 26, lineHeight: 34, color: L.text },
  brandBar: { flexDirection: 'row', width: 72, height: 4, marginTop: 10, borderRadius: 2, overflow: 'hidden' },
  brandSeg: { height: '100%' },
  subtitle: {
    marginTop: 12,
    marginBottom: 24,
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: L.textSecondary,
  },

  field: { marginBottom: 4 },
  label: { fontFamily: Fonts.medium, fontSize: 14, color: L.text, marginBottom: 6 },
  halo: { borderWidth: 3, borderColor: 'transparent', borderRadius: 17, margin: -3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: L.field,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: L.fieldBorder,
    paddingLeft: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingRight: 14,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: L.text,
    // En web el navegador dibuja su propio contorno encima del halo: el halo ya marca el foco.
    // Con estilo `auto` Chrome pinta su anillo aunque el ancho sea 0: hace falta `solid`.
    ...(Platform.OS === 'web' ? { outlineStyle: 'solid', outlineWidth: 0 } : null),
  },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  fieldError: {
    minHeight: 20,
    marginTop: 4,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.danger,
  },

  btnPrimary: {
    marginTop: 12,
    height: 52,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: L.button,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { fontFamily: Fonts.semibold, color: L.buttonText, fontSize: 16 },

  linkTap: { minHeight: 44, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: 8 },
  linkMuted: { fontFamily: Fonts.medium, fontSize: 14, color: L.textSecondary, textDecorationLine: 'underline' },
  linkGreen: { fontFamily: Fonts.semibold, fontSize: 14, color: L.linkGreen },
  divider: { height: 1, backgroundColor: L.fieldBorder, marginVertical: 12 },
  registerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  registerText: { fontFamily: Fonts.regular, fontSize: 14, color: L.textSecondary },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: L.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footerText: { fontFamily: Fonts.regular, fontSize: 13, color: L.textSecondary },
});
