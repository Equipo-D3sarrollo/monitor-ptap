import { memo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from './AppIcon';
import { Fonts } from '../constants/fonts';
import { estilosConTema, useTheme } from '../context/ThemeContext';

/**
 * Franja roja arriba de las tarjetas: la primera señal fuera de rango (hasRangeAnomaly), su valor
 * y el límite que rompe, y "+N más". `role="alert"` para que el lector de pantalla la anuncie.
 * El texto lo arma `anomalyBanner()` de card-look.ts; aquí solo se pinta.
 */
function AnomalyBannerBase({ text, more }: { text: string; more: number }) {
  const { t } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.banner} role="alert" accessibilityLiveRegion="assertive">
      <Ionicons name="warning-outline" size={20} color={t.criticoTexto} />
      <Text style={styles.text}>
        <Text style={styles.strong}>{text}</Text>
        {more > 0 ? <Text style={styles.more}>{`  +${more} más`}</Text> : null}
      </Text>
    </View>
  );
}

export const AnomalyBanner = memo(AnomalyBannerBase);

const useStyles = estilosConTema((t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: t.bannerFondo,
    borderWidth: 1,
    borderColor: t.critico,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 5,
    marginBottom: 12,
  },
  text: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: t.bannerTexto },
  strong: { fontFamily: Fonts.semibold, color: t.criticoTexto },
  more: { fontFamily: Fonts.medium, color: t.bannerTexto },
}));
