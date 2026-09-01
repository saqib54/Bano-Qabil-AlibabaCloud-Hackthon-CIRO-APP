import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, 
  useWindowDimensions, TouchableOpacity, Animated 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import StatCard from '../components/StatCard';
import ScenarioButton from '../components/ScenarioButton';
import ThemeToggle from '../components/ThemeToggle';
import { getStats, getScenario } from '../services/apiService';

const HEATMAP_DATA = [
  [8, 2, 1, 0, 0],
  [4, 9, 3, 1, 0],
  [1, 5, 2, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const RECENT_ACTIVITY = [
  { id: 1, type: 'CRITICAL', text: 'Flood detected in G-10', time: '2m ago', icon: 'water' },
  { id: 2, type: 'INFO', text: 'Rescue 1122 Unit A dispatched', time: '5m ago', icon: 'medkit' },
  { id: 3, type: 'SUCCESS', text: 'Public SMS alerts delivered (45k)', time: '8m ago', icon: 'notifications' },
  { id: 4, type: 'WARN', text: 'Power grid instability in F-7', time: '15m ago', icon: 'flash' },
  { id: 5, type: 'INFO', text: 'Traffic rerouted to Kashmir Hwy', time: '22m ago', icon: 'git-network' },
];

export default function DashboardScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState({
    activeCrises: 0,
    signalsToday: 0,
    actionsDone: 0,
    avgResponseTime: '0m'
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const data = await getStats();
    if (data) setStats(data);
  };

  const getHeatColor = (val) => {
    if (val >= 8) return '#FF4444';
    if (val >= 5) return '#FF9500';
    if (val >= 2) return '#FFCC00';
    return isDark ? '#1C2333' : '#EBEEF3';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.title, { color: colors.text.primary }]}>CITY DASHBOARD</Text>
              <Text style={[styles.subtitle, { color: colors.text.muted }]}>REAL-TIME CRISIS METRICS — ISLAMABAD</Text>
            </View>
            <ThemeToggle />
          </View>
        </View>

        {/* 2x2 Stat Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard 
              label="ACTIVE CRISES" 
              value={stats.activeCrises} 
              icon="alert-circle" 
              color={colors.severity.critical.text} 
            />
            <StatCard 
              label="SIGNALS TODAY" 
              value={stats.signalsToday} 
              icon="radio" 
              color={colors.status.info} 
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard 
              label="ACTIONS EXECUTED" 
              value={stats.actionsDone} 
              icon="checkmark-done-circle" 
              color={colors.status.success} 
            />
            <StatCard 
              label="AVG RESPONSE" 
              value={stats.avgResponseTime} 
              icon="time" 
              color="#4A9EFF" 
            />
          </View>
        </View>

        {/* Heatmap Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>CITY INCIDENT HEATMAP</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.dot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={[
            styles.heatmapCard, 
            { 
              backgroundColor: colors.bg.surface, 
              borderColor: colors.bg.border,
              elevation: isDark ? 0 : 2,
              shadowOpacity: isDark ? 0 : 0.05,
            }
          ]}>
            <View style={styles.heatmapGrid}>
              {HEATMAP_DATA.map((row, rIdx) => (
                <View key={rIdx} style={styles.heatmapRow}>
                  {row.map((val, cIdx) => (
                    <View 
                      key={cIdx} 
                      style={[styles.heatCell, { backgroundColor: getHeatColor(val) }]} 
                    />
                  ))}
                </View>
              ))}
            </View>
            <View style={styles.heatmapLegend}>
              <Text style={[styles.legendText, { color: colors.text.muted }]}>LOW</Text>
              <LinearGradient 
                colors={[isDark ? '#1C2333' : '#EBEEF3', '#FFCC00', '#FF9500', '#FF4444']} 
                start={{x:0, y:0}} end={{x:1, y:0}} 
                style={styles.legendBar} 
              />
              <Text style={[styles.legendText, { color: colors.text.muted }]}>CRITICAL</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>RECENT ACTIVITY</Text>
          <View style={[
            styles.activityCard, 
            { 
              backgroundColor: colors.bg.surface, 
              borderColor: colors.bg.border,
              elevation: isDark ? 0 : 2,
              shadowOpacity: isDark ? 0 : 0.05,
            }
          ]}>
            {RECENT_ACTIVITY.map((item, index) => (
              <View key={item.id} style={[
                styles.activityItem, 
                { borderBottomColor: colors.bg.border },
                index === RECENT_ACTIVITY.length - 1 && { borderBottomWidth: 0 }
              ]}>
                <View style={[
                  styles.activityIconBg, 
                  { backgroundColor: item.type === 'CRITICAL' ? '#FF444422' : (isDark ? '#FFFFFF11' : '#EBEEF3') }
                ]}>
                  <Ionicons 
                    name={item.icon} 
                    size={16} 
                    color={item.type === 'CRITICAL' ? colors.severity.critical.text : colors.text.secondary} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityText, { color: colors.text.primary }]}>{item.text}</Text>
                  <Text style={[styles.activityTime, { color: colors.text.muted }]}>{item.time}</Text>
                </View>
                {item.type === 'CRITICAL' && <View style={styles.newBadge} />}
              </View>
            ))}
          </View>
        </View>

        {/* Quick Scenarios */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text.muted }]}>TACTICAL SCENARIOS</Text>
          <ScenarioButton 
            title="Flood Sequence" 
            subtitle="Trigger G-10 flooding simulation" 
            color="#FF4444"
            onPress={() => navigation.navigate('Report')}
          />
          <ScenarioButton 
            title="Power Grid Failure" 
            subtitle="Execute F-7 sector power restoration" 
            color="#FF9500"
            onPress={() => navigation.navigate('Report')}
          />
        </View>
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
  statsGrid: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF444415',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  liveText: {
    color: '#FF4444',
    fontSize: 9,
    fontWeight: '900',
  },
  heatmapCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  heatmapGrid: {
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 6,
  },
  heatCell: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    gap: 12,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '800',
  },
  legendBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  activityIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 10,
    marginTop: 2,
  },
  newBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  }
});

