import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  Dimensions, TouchableOpacity, Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import BeforeAfterToggle from '../components/BeforeAfterToggle';

const { width } = Dimensions.get('window');

const METRICS = [
  { label: 'RESPONSE TIME', before: '45 mins', after: '8 mins', improvement: '82%' },
  { label: 'RESOURCE EFFICIENCY', before: '35%', after: '94%', improvement: '59%' },
  { label: 'POPULATION REACH', before: '12k', after: '45k', improvement: '275%' },
  { label: 'COORDINATION LAG', before: '14 mins', after: '0.2s', improvement: '99%' },
];

const TIMELINE_BEFORE = [
  { time: '00:00', event: 'Signal reported on Social Media', status: 'UNSEEN' },
  { time: '00:15', event: 'First responder manually notified', status: 'DELAYED' },
  { time: '00:30', event: 'Resource dispatch requested', status: 'PENDING' },
  { time: '00:45', event: 'Emergency services arrive', status: 'LATE' },
];

const TIMELINE_AFTER = [
  { time: '00:00', event: 'Signal ingestion & AI Analysis', status: 'INSTANT' },
  { time: '00:01', event: 'Tactical response plan generated', status: 'SUCCESS' },
  { time: '00:02', event: '45,000 residents notified via SMS', status: 'SUCCESS' },
  { time: '00:05', event: 'Rescue Unit A arrives via Alt Route', status: 'SUCCESS' },
];

export default function ComparisonScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [activeState, setActiveState] = useState('AFTER');

  const data = activeState === 'AFTER' ? TIMELINE_AFTER : TIMELINE_BEFORE;
  const accentColor = activeState === 'AFTER' ? '#00D084' : '#FF4444';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backBtn, { backgroundColor: colors.bg.card, borderColor: colors.bg.border }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text.primary }]}>IMPACT ANALYSIS</Text>
          <Text style={[styles.subtitle, { color: colors.text.muted }]}>CIRO ORCHESTRATION VS MANUAL RESPONSE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Metric Comparison Cards */}
        <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>CORE PERFORMANCE METRICS</Text>
        <View style={styles.metricsGrid}>
          {METRICS.map((m, i) => (
            <View key={i} style={[
              styles.metricCard, 
              { 
                backgroundColor: colors.bg.surface, 
                borderColor: colors.bg.border,
                elevation: isDark ? 0 : 2,
                shadowOpacity: isDark ? 0 : 0.05,
              }
            ]}>
              <Text style={[styles.metricLabel, { color: colors.text.muted }]}>{m.label}</Text>
              <View style={styles.metricValues}>
                <View style={styles.metricBox}>
                  <Text style={[styles.valSub, { color: colors.text.muted }]}>MANUAL</Text>
                  <Text style={[styles.valBefore, { color: colors.text.secondary }]}>{m.before}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />
                <View style={styles.metricBox}>
                  <Text style={[styles.valSub, { color: '#00D084' }]}>CIRO</Text>
                  <Text style={[styles.valAfter, { color: colors.text.primary }]}>{m.after}</Text>
                </View>
              </View>
              <View style={[styles.improvementBadge, { backgroundColor: '#00D08422' }]}>
                <Text style={styles.improvementText}>+{m.improvement}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tactical Timeline Comparison */}
        <View style={styles.timelineHeader}>
          <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>TACTICAL SEQUENCE</Text>
          <BeforeAfterToggle activeState={activeState} onChange={setActiveState} />
        </View>

        <View style={[
          styles.timelineCard, 
          { 
            backgroundColor: colors.bg.card, 
            borderColor: isDark ? accentColor + '33' : colors.bg.border,
            elevation: isDark ? 0 : 2,
            shadowOpacity: isDark ? 0 : 0.05,
          }
        ]}>
          {data.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timeColumn}>
                <Text style={[styles.timeText, { color: accentColor }]}>{item.time}</Text>
                {index < data.length - 1 && <View style={[styles.timeLine, { backgroundColor: accentColor + '22' }]} />}
              </View>
              <View style={styles.eventColumn}>
                <Text style={[styles.eventText, { color: colors.text.primary }]}>{item.event}</Text>
                <View style={[styles.statusBadge, { backgroundColor: accentColor + '15' }]}>
                  <Text style={[styles.statusText, { color: accentColor }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.summaryBox, { backgroundColor: '#00D08410', borderColor: '#00D08433' }]}>
          <Ionicons name="shield-checkmark" size={32} color="#00D084" />
          <Text style={styles.summaryTitle}>COORDINATION ADVANTAGE</Text>
          <Text style={[styles.summaryText, { color: colors.text.secondary }]}>
            CIRO agents reduced response time by 37 minutes and improved resource utilization by 59% in this scenario.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 30,
  },
  metricCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 12,
  },
  metricValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 60,
  },
  metricBox: {
    gap: 4,
  },
  valSub: {
    fontSize: 8,
    fontWeight: '800',
  },
  valBefore: {
    fontSize: 18,
    fontWeight: '700',
  },
  valAfter: {
    fontSize: 22,
    fontWeight: '900',
  },
  improvementBadge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  improvementText: {
    color: '#00D084',
    fontSize: 12,
    fontWeight: '900',
    transform: [{ rotate: '-90deg' }],
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 30,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
    gap: 20,
  },
  timeColumn: {
    alignItems: 'center',
    width: 50,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  timeLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  eventColumn: {
    flex: 1,
    paddingBottom: 20,
  },
  eventText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryBox: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryTitle: {
    color: '#00D084',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  }
});

