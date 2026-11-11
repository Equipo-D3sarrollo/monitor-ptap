import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from './WaterVector';
import Colors from '../constants/colors';

// La identidad del agua permanece sin bucles decorativos ni trabajo por frame en JS.
export const WaterBackground = memo(function WaterBackground({ level }: { level: number }) {
  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.water, { height: `${Math.max(0, Math.min(1, level)) * 100}%` }]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 1200 240" preserveAspectRatio="none">
        <Path d="M0 70 Q300 0 600 65 T1200 50 V240 H0 Z" fill={Colors.login.waveBack} />
        <Path d="M0 95 Q300 35 600 90 T1200 75 V240 H0 Z" fill={Colors.login.waveMid} />
        <Path d="M0 125 Q300 65 600 115 T1200 105 V240 H0 Z" fill={Colors.login.waveFront} />
      </Svg>
    </View>
  );
});
const styles = StyleSheet.create({ water: { position: 'absolute', left: 0, right: 0, bottom: 0 } });
