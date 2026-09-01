import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

function TimelineStep({ step, isLast, index }) {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step.status === 'IN_PROGRESS') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [step.status]);

  const getStatusBg = (status) => {
    switch (status) {
      case 'COMPLETED': return colors.status.success + '22';
      case 'IN_PROGRESS': return colors.status.warning + '22';
      case 'FAILED': return colors.status.error + '22';
      default: return colors.bg.border;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return colors.status.success;
      case 'IN_PROGRESS': return colors.status.warning;
      case 'FAILED': return colors.status.error;
      default: return colors.text.muted;
    }
  };

  const renderStatusIcon = () => {
    switch (step.status) {
      case 'COMPLETED':
        return (
          <View style={[styles.circle, { backgroundColor: colors.status.success }]}>
            <Ionicons name="checkmark" size={12} color="white" />
          </View>
        );
      case 'IN_PROGRESS':
        return (
          <View style={styles.pulseContainer}>
            <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }], backgroundColor: colors.status.warning + '66' }]} />
            <View style={[styles.circle, { backgroundColor: colors.status.warning }]}>
              <View style={styles.spinner} />
            </View>
          </View>
        );
      case 'FAILED':
        return (
          <View style={[styles.circle, { backgroundColor: colors.status.error }]}>
            <Ionicons name="close" size={12} color="white" />
          </View>
        );
      case 'PENDING':
      default:
        return <View style={[styles.circle, { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.text.disabled }]} />;
    }
  };

  return (
    <View style={styles.stepContainer}>
      <View style={styles.leftColumn}>
        {renderStatusIcon()}
        {!isLast && <View style={[
          styles.line, 
          { backgroundColor: isDark ? colors.bg.border : '#D1D9E6' },
          step.status === 'COMPLETED' && { backgroundColor: colors.status.success }
        ]} />}
      </View>
      
      <View style={styles.rightColumn}>
        <View style={styles.stepHeader}>
          <Text style={[styles.timestamp, { color: colors.text.muted }]}>{step.timestamp || '00:00'}</Text>
          <View style={[styles.agentBadge, { backgroundColor: colors.agents[`agent${step.agentId || 1}`] + '33' }]}>
            <Text style={[styles.agentText, { color: colors.agents[`agent${step.agentId || 1}`] }]}>AGT-{step.agentId || 1}</Text>
          </View>
        </View>
        
        <View style={[
          styles.contentCard, 
          { 
            backgroundColor: colors.bg.surface, 
            borderColor: colors.bg.border,
            elevation: isDark ? 0 : 2,
            shadowOpacity: isDark ? 0 : 0.05,
          }
        ]}>
          <View style={styles.titleRow}>
            <Text style={[styles.actionName, { color: colors.text.primary }]}>{step.actionName || 'Generic Action'}</Text>
            <View style={[styles.statusChip, { backgroundColor: getStatusBg(step.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(step.status) }]}>{step.status}</Text>
            </View>
          </View>
          
          <Text style={[styles.detailText, { color: colors.text.secondary }]}>{step.detail || 'Executing tactical response plan...'}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ExecutionTimeline({ steps }) {
  if (!steps || steps.length === 0) return null;
  
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <TimelineStep 
          key={index} 
          step={step} 
          index={index} 
          isLast={index === steps.length - 1} 
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    minHeight: 80,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pulseContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  rightColumn: {
    flex: 1,
    paddingBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginRight: 8,
  },
  agentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  agentText: {
    fontSize: 9,
    fontWeight: '800',
  },
  contentCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionName: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  detailText: {
    fontSize: 11,
    lineHeight: 16,
  },
});

