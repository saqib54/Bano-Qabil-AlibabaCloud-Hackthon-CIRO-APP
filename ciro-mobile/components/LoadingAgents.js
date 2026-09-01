import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AGENT_STEPS = [
  { id: 1, title: 'Agent 1: Reading signals', icon: 'radio' },
  { id: 2, title: 'Agent 2: Detecting crisis', icon: 'brain' },
  { id: 3, title: 'Agent 3: Planning response', icon: 'flash' },
  { id: 4, title: 'Agent 4: Simulating actions', icon: 'rocket' },
];

function AgentCard({ step, status }) {
  const { colors, isDark } = useTheme();

  const getBorderColor = () => {
    if (status === 'COMPLETED') return colors.status.success;
    if (status === 'IN_PROGRESS') return colors.status.warning;
    return colors.text.disabled;
  };

  const getIconColor = () => {
    if (status === 'COMPLETED') return colors.status.success;
    if (status === 'IN_PROGRESS') return colors.status.warning;
    return colors.text.muted;
  };

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.bg.surface,
        borderColor: colors.bg.border,
        borderLeftColor: getBorderColor(),
        elevation: isDark ? 0 : 2,
        shadowOpacity: isDark ? 0 : 0.05,
      }
    ]}>
      <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '15' }]}>
        <Ionicons name={step.icon} size={20} color={getIconColor()} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: status === 'PENDING' ? colors.text.muted : colors.text.primary }]}>
          {step.title}
        </Text>
        <Text style={[styles.statusText, { color: colors.text.muted }]}>
          {status === 'COMPLETED' ? 'Analysis Complete' : status === 'IN_PROGRESS' ? 'Processing...' : 'Waiting...'}
        </Text>
      </View>
      {status === 'COMPLETED' && (
        <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
      )}
    </View>
  );
}

export default function LoadingAgents({ currentStep }) {
  return (
    <View style={styles.container}>
      {AGENT_STEPS.map((step, index) => {
        const stepNum = index + 1;
        let status = 'PENDING';
        if (stepNum < currentStep) status = 'COMPLETED';
        else if (stepNum === currentStep) status = 'IN_PROGRESS';
        
        return <AgentCard key={step.id} step={step} status={status} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

