import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  Animated, Easing, useWindowDimensions, TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import ExecutionTimeline from '../components/ExecutionTimeline';
import BeforeAfterToggle from '../components/BeforeAfterToggle';
import ThemeToggle from '../components/ThemeToggle';


const BEFORE_DATA = [
  { label: 'G-10 Main Road', status: 'ROUTE BLOCKED', icon: '🚫', color: '#FF4444' },
  { label: 'Rescue Team', status: 'UNASSIGNED', icon: '⏸️', color: '#8892A4' },
  { label: 'Public Alerts', status: 'NO ALERTS', icon: '🔕', color: '#8892A4' },
];

const AFTER_DATA = [
  { label: 'Kashmir Highway', status: 'ROUTE CLEAR', icon: '✅', color: '#00D084' },
  { label: 'Rescue 1122 Unit A', status: 'EN ROUTE', icon: '🚑', color: '#00D084' },
  { label: 'Alerts Sent', status: 'NOTIFIED', icon: '📢', color: '#00D084' },
];

export default function SimulationScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { logs, actions, crisis } = route.params || {};
  const [activeToggle, setActiveToggle] = useState('BEFORE');
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const completedCount = logs?.filter(l => l.status === 'COMPLETED').length || 0;
  const totalCount = logs?.length || actions?.length || 1;
  const progressPercent = Math.min(1, completedCount / totalCount);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 2000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    if (progressPercent >= 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [progressPercent]);

  const stateData = activeToggle === 'AFTER' ? AFTER_DATA : BEFORE_DATA;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.title, { color: colors.text.primary }]}>LIVE EXECUTION THEATER</Text>
              <Text style={[styles.subtitle, { color: colors.text.muted }]}>ORCHESTRATING TACTICAL RESPONSE FOR {crisis?.id || 'DEMO'}</Text>
            </View>
            <ThemeToggle />
          </View>
        </View>

        {/* Progress Bar Section */}
        <View style={[styles.progressSection, { backgroundColor: colors.bg.surface, borderColor: colors.bg.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.text.muted }]}>EXECUTION STATUS</Text>
            <Text style={[styles.progressValue, { color: colors.text.primary }]}>{Math.round(progressPercent * 100)}%</Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.bg.border }]}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: '#FF4444'
                }
              ]} 
            />
          </View>
        </View>

        {/* Before/After Toggle Panel */}
        <View style={styles.toggleSection}>
          <BeforeAfterToggle activeState={activeToggle} onChange={setActiveToggle} />
          
          <View style={styles.stateCardsContainer}>
            {stateData.map((item, index) => (
              <View 
                key={index} 
                style={[
                  styles.stateCard, 
                  { 
                    backgroundColor: activeToggle === 'AFTER' ? '#00D08410' : '#FF444410',
                    borderColor: activeToggle === 'AFTER' ? '#00D08433' : '#FF444433'
                  }
                ]}
              >
                <Text style={styles.stateIcon}>{item.icon}</Text>
                <View style={styles.stateTextContainer}>
                  <Text style={[styles.stateLabel, { color: colors.text.primary }]}>{item.label}</Text>
                  <Text style={[styles.stateStatus, { color: item.color }]}>{item.status}</Text>
                </View>
                <Ionicons 
                  name={activeToggle === 'AFTER' ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={item.color} 
                />
              </View>
            ))}
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>EXECUTION TIMELINE</Text>
          <ExecutionTimeline 
            steps={logs?.map(l => ({
              timestamp: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              agentId: l.agent?.replace('AGENT_', '') || 4,
              actionName: l.action_id || 'System Action',
              status: l.status,
              detail: l.message
            }))} 
          />
        </View>

        {/* Summary Card */}
        <View style={[
          styles.summaryCard, 
          { 
            backgroundColor: isDark ? '#141927' : colors.bg.card,
            borderColor: progressPercent >= 1 ? colors.status.success : colors.severity.critical.border,
            elevation: isDark ? 0 : 2,
            shadowOpacity: isDark ? 0 : 0.05,
          }
        ]}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.text.primary }]}>{totalCount}</Text>
              <Text style={[styles.summaryLab, { color: colors.text.muted }]}>TOTAL ACTIONS</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.status.success }]}>{completedCount}</Text>
              <Text style={[styles.summaryLab, { color: colors.text.muted }]}>COMPLETED</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.status.error }]}>0</Text>
              <Text style={[styles.summaryLab, { color: colors.text.muted }]}>FAILED</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: colors.text.primary }]}>14s</Text>
              <Text style={[styles.summaryLab, { color: colors.text.muted }]}>TIME TAKEN</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.traceBtn, { backgroundColor: colors.bg.card, borderColor: colors.bg.border }]}
          onPress={() => navigation.navigate('AgentTrace', { traces: route.params?.traces })}
        >
          <Text style={[styles.traceBtnText, { color: colors.text.primary }]}>VIEW AGENT DECISION LOGS</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.compareBtn, { backgroundColor: '#4A9EFF' }]}
          onPress={() => navigation.navigate('Comparison')}
        >
          <Text style={styles.compareBtnText}>OPEN FULL COMPARISON</Text>
          <Ionicons name="duplicate" size={16} color="white" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '700',
  },
  progressSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  toggleSection: {
    marginBottom: 30,
  },
  stateCardsContainer: {
    marginTop: 16,
  },
  stateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  stateIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  stateTextContainer: {
    flex: 1,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  stateStatus: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  timelineSection: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '45%',
    marginBottom: 16,
  },
  summaryVal: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLab: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
  traceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  traceBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 10,
  },
  compareBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  }
});

