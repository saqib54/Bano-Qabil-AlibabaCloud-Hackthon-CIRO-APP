import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Animated, useWindowDimensions, LayoutAnimation, Platform, UIManager 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import SeverityBadge from '../components/SeverityBadge';
import ConfidenceMeter from '../components/ConfidenceMeter';
import ThemeToggle from '../components/ThemeToggle';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTION_ICONS = {
  dispatch_rescue: 'medkit',
  reroute_traffic: 'git-network',
  send_alert: 'notifications',
  notify_hospital: 'medical',
  close_area: 'hand-left',
};

export default function CrisisDetailScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { crisis, actions, logs, traces } = route.params || {};
  const [showEvidence, setShowEvidence] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const sev = crisis?.severity?.toLowerCase() || 'low';
  const config = colors.severity[sev] || colors.severity.low;

  useEffect(() => {
    if (sev === 'critical') {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  const toggleEvidence = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEvidence(!showEvidence);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getPriorityColor = (p) => {
    if (p === 1) return colors.severity.critical.border;
    if (p === 2) return colors.severity.high.border;
    return colors.severity.medium.border;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Severity Banner */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <LinearGradient
            colors={[config.bg, colors.bg.primary]}
            style={[styles.banner, { borderColor: config.border }]}
          >
            <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
              <ThemeToggle />
            </View>
            <Text style={styles.bannerEmoji}>{crisis?.typeIcon || '🌊'}</Text>
            <Text style={[styles.bannerTitle, { color: isDark ? 'white' : colors.text.primary }]}>
              {(crisis?.crisis_type || 'CRISIS').toUpperCase()}
            </Text>
            <SeverityBadge severity={sev} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.mainInfo}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text.muted }]}>AFFECTED AREA</Text>
              <Text style={[styles.locationText, { color: colors.text.primary }]}>📍 {crisis?.affected_area || 'Islamabad, PK'}</Text>
            </View>
            <ConfidenceMeter percentage={crisis?.confidence || 0} />
          </View>

          <Text style={[styles.label, { color: colors.text.muted }]}>CRISIS SUMMARY</Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.bg.surface, borderColor: colors.bg.border }]}>
            <Text style={[styles.summaryText, { color: colors.text.secondary }]}>{crisis?.summary || 'No summary available.'}</Text>
          </View>

          {/* Evidence Section */}
          <TouchableOpacity style={styles.evidenceToggle} onPress={toggleEvidence}>
            <Text style={[styles.label, { color: colors.text.muted }]}>EVIDENCE SIGNALS</Text>
            <Ionicons name={showEvidence ? "chevron-up" : "chevron-down"} size={16} color={colors.text.muted} />
          </TouchableOpacity>
          {showEvidence && (
            <View style={styles.evidenceContent}>
              {(crisis?.key_signals_used || ['SIG-001', 'SIG-002', 'SIG-003']).map((sig, i) => (
                <View key={i} style={styles.evidenceItem}>
                  <Ionicons name="document-text" size={14} color={colors.status.info} />
                  <Text style={[styles.evidenceText, { color: colors.status.info }]}>Signal data: {sig}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: colors.text.muted }]}>RESPONSE ACTION PLAN</Text>
          {actions?.map((action, index) => (
            <View key={index} style={[
              styles.actionCard, 
              { 
                backgroundColor: colors.bg.card, 
                borderColor: colors.bg.border,
                borderLeftColor: getPriorityColor(action.priority) 
              }
            ]}>
              <View style={styles.actionHeader}>
                <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(action.priority) + '22' }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(action.priority) }]}>P{action.priority}</Text>
                </View>
                <Ionicons name={ACTION_ICONS[action.type] || 'flash'} size={20} color={colors.text.primary} />
                <Text style={[styles.actionTitle, { color: colors.text.primary }]}>{action.type?.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
              <Text style={[styles.actionDesc, { color: colors.text.secondary }]}>{action.description}</Text>
              <View style={styles.actionFooter}>
                <Text style={[styles.resourceText, { color: colors.text.muted }]}>👤 {action.assigned_resource || 'Dispatch Unit A'}</Text>
                <Text style={[styles.impactText, { color: colors.status.success }]}>📈 Impact: {action.estimated_impact || 'High'}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.stickyFooter, { backgroundColor: colors.bg.secondary, borderTopColor: colors.bg.border }]}>
        <View style={styles.footerInfo}>
          <SeverityBadge severity={sev} />
          <Text style={[styles.footerActionsText, { color: colors.text.muted }]}>{actions?.length || 0} ACTIONS READY</Text>
        </View>
        <TouchableOpacity 
          style={styles.executeBtnWrapper} 
          onPress={() => navigation.navigate('Simulation', { logs, actions, crisis, traces })}
        >
          <LinearGradient
            colors={['#FF4444', '#FF2D55']}
            style={styles.executeBtn}
          >
            <Text style={styles.executeBtnText}>EXECUTE FULL SIMULATION</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  banner: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingTop: 20,
  },
  bannerEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainInfo: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  evidenceToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  evidenceContent: {
    marginBottom: 24,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  evidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  priorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '900',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  actionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  impactText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerInfo: {
    flex: 1,
  },
  footerActionsText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  executeBtnWrapper: {
    flex: 2,
  },
  executeBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  executeBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

