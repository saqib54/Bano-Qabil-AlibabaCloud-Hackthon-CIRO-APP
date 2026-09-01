import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ScenarioButton({ icon, title, subtitle, color, onPress }) {
  const { colors, isDark } = useTheme();
  const buttonColor = color || colors.severity.critical.text;

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress}
      style={[
        styles.container, 
        { 
          borderColor: isDark ? buttonColor + '44' : colors.bg.border, 
          backgroundColor: isDark ? buttonColor + '10' : colors.bg.card 
        }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: buttonColor }]}>
        <Text style={styles.icon}>{icon || '🚀'}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.text.muted }]}>{subtitle}</Text>
      </View>
      <View style={[styles.arrowContainer, { backgroundColor: buttonColor + '22' }]}>
        <Text style={[styles.arrow, { color: buttonColor }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    // Light mode shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});

