import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function StatCard({ value, label, color, icon }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const cardColor = color || colors.status.info;
  
  const isSmallScreen = width < 380;

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.bg.card,
        borderColor: isDark ? cardColor + '33' : colors.bg.border,
        elevation: isDark ? 0 : 2,
        shadowOpacity: isDark ? 0 : 0.05,
        padding: isSmallScreen ? 12 : 16,
      }
    ]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: cardColor + '15' }]}>
          {typeof icon === 'string' && icon.length > 2 ? (
            <Ionicons name={icon} size={isSmallScreen ? 16 : 20} color={cardColor} />
          ) : (
            <Text style={[styles.emojiIcon, { fontSize: isSmallScreen ? 14 : 18 }]}>{icon || '📊'}</Text>
          )}
        </View>
      </View>
      
      <Text style={[styles.value, { color: cardColor, fontSize: isSmallScreen ? 20 : 26 }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.text.muted, fontSize: isSmallScreen ? 8 : 9 }]}>{label ? label.toUpperCase() : 'STAT'}</Text>
      
      <View style={[styles.accentBar, { backgroundColor: cardColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    margin: 4,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 110,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 18,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.5,
  }
});

