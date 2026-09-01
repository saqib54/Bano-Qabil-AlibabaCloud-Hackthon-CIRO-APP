import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function AgentLogItem({ timestamp, agentId, message, level }) {
  const { colors } = useTheme();
  const levelColors = {
    INFO: colors.text.secondary,
    DETECT: '#4A9EFF',
    WARN: '#FFCC00',
    ACTION: '#FF9500',
    SUCCESS: '#00D084',
    ERROR: '#FF4444',
  };

  const color = levelColors[level?.toUpperCase()] || colors.text.primary;

  return (
    <View style={styles.container}>
      <Text style={[styles.timestamp, { color: colors.text.muted }]}>{timestamp}</Text>
      <Text style={[styles.agentId, { color: colors.agents[`agent${agentId}`] || colors.text.muted }]}>
        [AGT-{agentId}]
      </Text>
      <Text style={[styles.level, { color }]}>[{level?.toUpperCase()}]</Text>
      <Text style={[styles.message, { color: colors.text.primary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  timestamp: {
    fontFamily: 'monospace',
    fontSize: 10,
    width: 60,
  },
  agentId: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    width: 55,
    marginHorizontal: 4,
  },
  level: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    width: 65,
  },
  message: {
    fontFamily: 'monospace',
    fontSize: 11,
    flex: 1,
    flexWrap: 'wrap',
  },
});

