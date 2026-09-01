import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const SIZE = 100;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ConfidenceMeter({ percentage = 0, label = 'Confidence' }) {
  const { colors } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;
  const clampedValue = Math.min(100, Math.max(0, percentage));

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: clampedValue,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [clampedValue]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const getColor = () => {
    if (clampedValue >= 80) return colors.status.success;
    if (clampedValue >= 50) return colors.status.warning;
    return colors.status.error;
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.bg.border}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={styles.centerLabel}>
          <AnimatedText animValue={animValue} color={color} />
          <Text style={[styles.percentSymbol, { color: colors.text.muted }]}>%</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: colors.text.muted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function AnimatedText({ animValue, color }) {
  const [displayVal, setDisplayVal] = React.useState(0);

  useEffect(() => {
    const id = animValue.addListener(({ value }) => {
      setDisplayVal(Math.round(value));
    });
    return () => animValue.removeListener(id);
  }, [animValue]);

  return (
    <Text style={[styles.centerText, { color }]}>{displayVal}</Text>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ring: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  centerText: {
    fontSize: 24,
    fontWeight: '900',
  },
  percentSymbol: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 1,
  },
  label: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

