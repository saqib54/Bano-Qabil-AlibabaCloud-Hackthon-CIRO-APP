import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { themeMode, toggleTheme, colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: themeMode === 'light' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [themeMode, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        styles.container,
        {
          backgroundColor: colors.bg.card,
          borderColor: colors.bg.border,
        },
      ]}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <Ionicons
          name={themeMode === 'dark' ? 'sunny' : 'moon'}
          size={20}
          color={themeMode === 'dark' ? '#FFCC00' : '#4A9EFF'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    // Shadow for light mode
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default ThemeToggle;
