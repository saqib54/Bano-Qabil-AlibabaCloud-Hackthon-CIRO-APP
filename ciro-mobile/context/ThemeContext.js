import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Appearance, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to avoid crashes if used outside provider
    return {
      themeMode: 'dark',
      theme: darkTheme,
      colors: darkTheme.colors,
      isDark: true,
      toggleTheme: () => {}
    };
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('dark');
  
  // Animation values for smooth transitions
  const themeAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme');
        if (savedTheme) {
          setThemeMode(savedTheme);
          themeAnim.setValue(savedTheme === 'light' ? 1 : 0);
        } else {
          const systemTheme = Appearance.getColorScheme();
          const initialTheme = systemTheme === 'light' ? 'light' : 'dark';
          setThemeMode(initialTheme);
          themeAnim.setValue(initialTheme === 'light' ? 1 : 0);
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    
    Animated.timing(themeAnim, {
      toValue: newMode === 'light' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem('user-theme', newMode);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  };

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  const value = {
    themeMode,
    theme,
    toggleTheme,
    themeAnim,
    colors: theme.colors,
    isDark: themeMode === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
