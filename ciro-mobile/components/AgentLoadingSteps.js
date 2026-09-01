import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const STEPS = [
  { icon: '📡', label: 'Ingesting Signals', desc: 'Reading & tagging severity' },
  { icon: '🧠', label: 'Detecting Crisis', desc: 'Gemini AI analysis' },
  { icon: '📋', label: 'Planning Actions', desc: 'Resource-aware response' },
  { icon: '⚡', label: 'Executing Response', desc: 'Simulating all actions' },
];

function StepItem({ step, index, currentStep }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isDone = index < currentStep;
  const isActive = index === currentStep;
  const isWaiting = index > currentStep;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const circleColor = isDone ? '#00D084' : isActive ? '#4A9EFF' : '#252D3D';
  const circleBorder = isDone ? '#00D084' : isActive ? '#4A9EFF' : '#3A4557';
  const labelColor = isDone ? '#00D084' : isActive ? '#FFFFFF' : '#8892A4';

  return (
    <View style={styles.stepRow}>
      {/* Circle icon */}
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: circleColor, borderColor: circleBorder },
          isActive && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.circleIcon}>
          {isDone ? '✓' : step.icon}
        </Text>
      </Animated.View>

      {/* Connector line (not on last) */}
      {index < STEPS.length - 1 && (
        <View style={[styles.connector, { backgroundColor: isDone ? '#00D084' : '#252D3D' }]} />
      )}

      {/* Label + desc */}
      <View style={styles.stepText}>
        <Text style={[styles.stepLabel, { color: labelColor }]}>{step.label}</Text>
        <Text style={styles.stepDesc}>{step.desc}</Text>
        <Text style={[styles.stepStatus, { color: isDone ? '#00D084' : isActive ? '#4A9EFF' : '#3A4557' }]}>
          {isDone ? 'DONE' : isActive ? 'ACTIVE...' : 'WAITING'}
        </Text>
      </View>
    </View>
  );
}

export default function AgentLoadingSteps({ currentStep = 0 }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🤖 AI AGENTS WORKING</Text>
      <View style={styles.stepsList}>
        {STEPS.map((step, index) => (
          <StepItem
            key={index}
            step={step}
            index={index}
            currentStep={currentStep}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141927',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#252D3D',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  stepsList: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 8,
    position: 'relative',
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  circleIcon: {
    fontSize: 16,
  },
  connector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 28,
    zIndex: 0,
  },
  stepText: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 20,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepDesc: {
    color: '#8892A4',
    fontSize: 11,
    marginTop: 2,
  },
  stepStatus: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
});
