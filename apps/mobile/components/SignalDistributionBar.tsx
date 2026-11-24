import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { estilosConTema } from '../context/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const SignalDistributionBar = memo(function SignalDistributionBar({
  fraction,
  color,
  label,
}: {
  fraction: number;
  color: string;
  label: string;
}) {
  const ratio = Math.max(0, Math.min(1, fraction));
  const [progress] = useState(() => new Animated.Value(ratio));
  const previous = useRef(ratio);
  const reduced = useReducedMotion();
  const styles = useStyles();
  useEffect(() => {
    if (reduced || previous.current === ratio) {
      previous.current = ratio;
      progress.setValue(ratio);
      return;
    }
    previous.current = ratio;
    const animation = Animated.timing(progress, {
      toValue: ratio,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [ratio, reduced, progress]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.track}>
      <Animated.View
        style={[styles.fill, { backgroundColor: color, transform: [{ scaleX: progress }] }]}
      />
    </View>
  );
});
const useStyles = estilosConTema((t) => ({
  track: { height: 8, backgroundColor: t.divisor, borderRadius: 4, overflow: 'hidden' },
  fill: { width: '100%', height: '100%', transformOrigin: 'left center' },
}));
