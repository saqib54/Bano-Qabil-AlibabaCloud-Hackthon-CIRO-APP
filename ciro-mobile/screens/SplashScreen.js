import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SplashScreen({ onFinish }) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const radarAnim1 = useRef(new Animated.Value(0)).current;
  const radarAnim2 = useRef(new Animated.Value(0)).current;
  const [statusText, setStatusText] = useState('Initializing agents...');

  useEffect(() => {
    // Logo scaling and fading
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        friction: 4,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();

    // Radar animation 1
    Animated.loop(
      Animated.timing(radarAnim1, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      })
    ).start();

    // Radar animation 2 (delayed start)
    const radarTimer = setTimeout(() => {
      Animated.loop(
        Animated.timing(radarAnim2, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        })
      ).start();
    }, 1000);

    // Status text change
    const timer1 = setTimeout(() => setStatusText('All systems online'), 2000);
    
    // Auto-navigate after 3 seconds
    const timer2 = setTimeout(() => {
      onFinish();
    }, 3500);

    return () => {
      clearTimeout(radarTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const radarScale1 = radarAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const radarOpacity1 = radarAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  const radarScale2 = radarAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  const radarOpacity2 = radarAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      {/* Radar Rings */}
      <Animated.View style={[styles.radar, { transform: [{ scale: radarScale1 }], opacity: radarOpacity1 }]} />
      <Animated.View style={[styles.radar, { transform: [{ scale: radarScale2 }], opacity: radarOpacity2 }]} />
      
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: fadeAnim, alignItems: 'center' }}>
        <View style={styles.logoGlow}>
          <Ionicons name="shield-checkmark" size={80} color="#FF4444" />
        </View>
        <Text style={[styles.logoText, { color: isDark ? '#FFFFFF' : colors.text.primary }]}>CIRO</Text>
        <Animated.Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Crisis Intelligence. Real-Time Response.
        </Animated.Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={[styles.statusText, { color: colors.text.muted }]}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radar: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  logoGlow: {
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
