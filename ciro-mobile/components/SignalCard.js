import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SeverityBadge from './SeverityBadge';

const SOURCE_ICONS = {
  twitter: '🐦',
  facebook: '📘',
  resident_app: '📱',
  weather_alert: '⛈️',
  traffic_cam: '🚦',
  custom_input: '✍️',
};

export default function SignalCard({ signal }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const sev = signal.severity?.toLowerCase() || 'low';
  const config = colors.severity[sev] || colors.severity.low;

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.bg.card,
        borderColor: colors.bg.border,
        borderLeftColor: config.border,
        // Light mode specific: light gray outer border
        borderWidth: 1,
        elevation: isDark ? 0 : 2,
        shadowOpacity: isDark ? 0 : 0.05,
        marginHorizontal: width > 500 ? 40 : 20,
      }
    ]}>
      <View style={styles.header}>
        <View style={styles.sourceContainer}>
          <Text style={styles.sourceIcon}>{SOURCE_ICONS[signal.source] || '📡'}</Text>
          <View>
            <Text style={[styles.sourceName, { color: colors.text.muted }]}>{(signal.source || 'SYSTEM').toUpperCase()}</Text>
            <Text style={[styles.timestamp, { color: colors.text.muted }]}>{signal.time || 'JUST NOW'}</Text>
          </View>
        </View>
        <SeverityBadge severity={sev} />
      </View>
      
      <Text style={[styles.text, { color: colors.text.primary }]} numberOfLines={3}>{signal.text || signal.message}</Text>
      
      {signal.location && (
        <Text style={[styles.location, { color: colors.status.info }]}>📍 {signal.location}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sourceName: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 9,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  location: {
    fontSize: 12,
    marginTop: 12,
    fontWeight: '600',
  },
});

