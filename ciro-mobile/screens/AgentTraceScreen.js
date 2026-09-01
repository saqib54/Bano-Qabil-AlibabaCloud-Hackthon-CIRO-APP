import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, FlatList, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import AgentLogItem from '../components/AgentLogItem';
import { getWSUrl } from '../services/apiService';

const AGENTS = [1, 2, 3, 4];

export default function AgentTraceScreen({ route }) {
  const { colors, isDark } = useTheme();
  const initialTraces = route.params?.traces || [];
  const [logs, setLogs] = useState([]);
  const [activeAgent, setActiveAgent] = useState(1);
  const [isLive, setIsLive] = useState(true);
  const flatListRef = useRef(null);
  const ws = useRef(null);

  useEffect(() => {
    // Convert initial traces (strings) to log objects if they are strings
    const initialLogs = initialTraces.map((t, i) => {
      if (typeof t === 'string') {
        return {
          id: `initial_${i}`,
          agentId: t.includes('AGENT_1') ? 1 : t.includes('AGENT_2') ? 2 : t.includes('AGENT_3') ? 3 : 4,
          level: t.includes('ERROR') ? 'ERROR' : t.includes('WARN') ? 'WARN' : 'INFO',
          message: t.split('] ').pop(),
          timestamp: new Date().toLocaleTimeString()
        };
      }
      return t;
    });
    setLogs(initialLogs);

    if (isLive) {
      connectWS();
    }

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const connectWS = () => {
    try {
      ws.current = new WebSocket(getWSUrl());
      ws.current.onmessage = (e) => {
        const newLog = JSON.parse(e.data);
        setLogs(prev => [...prev, { ...newLog, id: `ws_${Date.now()}` }]);
        if (isLive) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      };
      ws.current.onclose = () => {
        if (isLive) setTimeout(connectWS, 3000);
      };
    } catch (e) {
      console.error("WS Connect Error", e);
    }
  };

  useEffect(() => {
    if (!isLive && ws.current) {
      ws.current.close();
    } else if (isLive && (!ws.current || ws.current.readyState === WebSocket.CLOSED)) {
      connectWS();
    }
  }, [isLive]);

  const filteredLogs = logs.filter(l => l.agentId === activeAgent);

  const exportLogs = async () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [AGT-${l.agentId}] [${l.level}] ${l.message}`).join('\n');
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : colors.bg.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.status.success }]}>AGENT DECISION LOG</Text>
        <View style={styles.liveRow}>
          <Text style={[styles.liveText, { color: isLive ? colors.status.success : colors.text.muted }]}>
            {isLive ? 'LIVE STREAM' : 'PAUSED'}
          </Text>
          <Switch 
            value={isLive} 
            onValueChange={setIsLive}
            trackColor={{ false: colors.bg.border, true: colors.status.success + '66' }}
            thumbColor={isLive ? colors.status.success : colors.text.muted}
          />
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.bg.border }]}>
        {AGENTS.map(id => (
          <TouchableOpacity 
            key={id} 
            style={[styles.tab, activeAgent === id && styles.activeTab]}
            onPress={() => {
              setActiveAgent(id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[
              styles.tabText, 
              { color: colors.text.muted },
              activeAgent === id && { color: '#FF4444' }
            ]}>
              AGT-{id}
            </Text>
            {activeAgent === id && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={[
        styles.terminalContainer, 
        { 
          backgroundColor: isDark ? '#060A13' : '#F5F7FA',
          borderColor: isDark ? '#1C2333' : colors.bg.border 
        }
      ]}>
        <FlatList
          ref={flatListRef}
          data={filteredLogs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AgentLogItem 
              timestamp={item.timestamp}
              agentId={item.agentId}
              message={item.message}
              level={item.level}
            />
          )}
          contentContainerStyle={styles.logList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: isDark ? colors.status.success : colors.text.muted }]}>
                [ NO LOG ENTRIES FOR AGENT-{activeAgent} ]
              </Text>
              <Text style={[styles.emptySubText, { color: colors.text.muted }]}>
                Waiting for decision trace sequence...
              </Text>
            </View>
          }
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.exportBtn, { backgroundColor: colors.bg.card, borderColor: colors.bg.border }]} 
          onPress={exportLogs}
        >
          <Ionicons name="share-outline" size={20} color={isDark ? "white" : colors.text.primary} />
          <Text style={[styles.exportBtnText, { color: isDark ? "white" : colors.text.primary }]}>EXPORT AGT-{activeAgent} LOGS</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    height: 3,
    backgroundColor: '#FF4444',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  terminalContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logList: {
    paddingVertical: 10,
  },
  emptyContainer: {
    flex: 1,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontFamily: 'monospace',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptySubText: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
  },
  exportBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  }
});

