import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function BeforeAfterToggle({ activeState, onChange }) {
  const { colors, isDark } = useTheme();
  const [slideAnim] = useState(new Animated.Value(activeState === 'AFTER' ? 1 : 0));

  const handleToggle = (state) => {
    onChange(state);
    Animated.timing(slideAnim, {
      toValue: state === 'AFTER' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const slideInterpolate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '51%'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.toggleBg, { backgroundColor: colors.bg.surface, borderColor: colors.bg.border }]}>
        <Animated.View style={[
          styles.slider, 
          { 
            backgroundColor: isDark ? colors.bg.card : '#FFFFFF', 
            borderColor: colors.bg.borderLight 
          }
        ]} />
        <TouchableOpacity 
          style={styles.option} 
          onPress={() => handleToggle('BEFORE')}
          activeOpacity={1}
        >
          <Text style={[styles.optionText, { color: colors.text.muted }, activeState === 'BEFORE' && { color: colors.text.primary }]}>BEFORE</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.option} 
          onPress={() => handleToggle('AFTER')}
          activeOpacity={1}
        >
          <Text style={[styles.optionText, { color: colors.text.muted }, activeState === 'AFTER' && { color: colors.text.primary }]}>AFTER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  toggleBg: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderWidth: 1,
    position: 'relative',
  },
  slider: {
    position: 'absolute',
    width: '47%',
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  option: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

