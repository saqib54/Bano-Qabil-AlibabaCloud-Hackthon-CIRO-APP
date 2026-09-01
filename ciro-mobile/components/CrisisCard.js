import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SeverityBadge from './SeverityBadge';

export default function CrisisCard({ crisis, onPress }) {
  const { colors, theme, isDark } = useTheme();
  const sev = crisis.severity?.toLowerCase() || 'low';
  const config = colors.severity[sev] || colors.severity.low;

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onPress}
      style={[
        styles.card, 
        { 
          backgroundColor: colors.bg.card,
          borderColor: config.border,
          elevation: isDark ? 0 : 4,
          shadowOpacity: isDark ? 0 : 0.1,
        }
      ]}
    >
      <View style={[styles.banner, { backgroundColor: config.bg }]}>
        <Text style={styles.typeIcon}>{crisis.typeIcon || '⚠️'}</Text>
        <SeverityBadge severity={sev} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>{crisis.title || 'Crisis Detected'}</Text>
        <Text style={[styles.location, { color: colors.text.secondary }]} numberOfLines={1}>📍 {crisis.location || 'N/A'}</Text>
        
        <View style={styles.footer}>
          <View style={styles.confidenceContainer}>
            <Text style={[styles.label, { color: colors.text.muted }]}>AI CONFIDENCE</Text>
            <View style={[styles.meterBg, { backgroundColor: colors.bg.border }]}>
              <View style={[styles.meterFill, { width: `${crisis.confidence || 0}%`, backgroundColor: config.text }]} />
            </View>
          </View>
          
          <View style={[styles.actionsBadge, { backgroundColor: colors.bg.surface, borderColor: colors.bg.border }]}>
            <Text style={[styles.actionsText, { color: colors.text.primary }]}>{crisis.actions?.length || 0} ACTIONS READY</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeIcon: {
    fontSize: 24,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  meterBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  meterFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  actionsText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
