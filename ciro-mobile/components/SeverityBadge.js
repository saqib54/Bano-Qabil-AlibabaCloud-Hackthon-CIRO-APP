import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SeverityBadge({ severity }) {
  const { theme, colors } = useTheme();
  const sev = severity?.toLowerCase() || 'low';
  const config = colors.severity[sev] || colors.severity.low;
  
  const iconMap = {
    critical: 'alert-circle',
    high: 'warning',
    medium: 'information-circle',
    low: 'checkmark-circle',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={iconMap[sev]} size={14} color={config.text} style={styles.icon} />
      <Text style={[styles.badgeText, { color: config.text }]}>
        {sev.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

