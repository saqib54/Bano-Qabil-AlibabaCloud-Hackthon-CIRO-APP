import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, KeyboardAvoidingView, Platform, 
  Animated, Easing, useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import LoadingAgents from '../components/LoadingAgents';
import { analyzeCrisis, getScenario } from '../services/apiService';
import ScenarioButton from '../components/ScenarioButton';
import ThemeToggle from '../components/ThemeToggle';


const SIGNAL_TYPES = [
  { id: 'flood', label: 'Flood', icon: '🌊' },
  { id: 'power', label: 'Power', icon: '⚡' },
  { id: 'accident', label: 'Accident', icon: '🚗' },
  { id: 'fire', label: 'Fire', icon: '🔥' },
  { id: 'storm', label: 'Storm', icon: '🌪️' },
  { id: 'infra', label: 'Infrastructure', icon: '🏗️' },
];

function VoiceWaves() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.voiceContainer}>
      {[0, 1, 2, 3, 4].map(i => (
        <Animated.View 
          key={i} 
          style={[
            styles.waveBar, 
            { 
              height: anim.interpolate({ 
                inputRange: [0, 1], 
                outputRange: [10 + i * 5, 30 - i * 5] 
              }),
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1]
              })
            }
          ]} 
        />
      ))}
      <Text style={styles.listeningText}>Listening...</Text>
    </View>
  );
}

export default function InputScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [signalType, setSignalType] = useState('flood');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [detectedLang, setDetectedLang] = useState(null);

  useEffect(() => {
    if (text.length > 5) {
      const isUrdu = /[\u0600-\u06FF]/.test(text);
      setDetectedLang(isUrdu ? 'Urdu detected' : 'English detected');
    } else {
      setDetectedLang(null);
    }
  }, [text]);

  const runAnalysis = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setCurrentStep(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulated agent steps
    const timer1 = setTimeout(() => setCurrentStep(2), 1500);
    const timer2 = setTimeout(() => setCurrentStep(3), 3000);
    const timer3 = setTimeout(() => setCurrentStep(4), 4500);

    const result = await analyzeCrisis([], text);

    setTimeout(() => {
      setLoading(false);
      setCurrentStep(0);
      if (result && result.crisis) {
        navigation.navigate('Crises', { 
          screen: 'CrisisDetail', 
          params: { 
            crisis: result.crisis, 
            actions: result.actions, 
            logs: result.execution_logs,
            traces: result.agent_traces
          } 
        });
      }
    }, 5500);
  };

  const handleScenario = async (name) => {
    const data = await getScenario(name);
    if (data) {
      setText(data.text);
      setSignalType(data.type?.toLowerCase());
      runAnalysis();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Grid Pattern Background */}
          <View style={[styles.gridOverlay, { borderColor: isDark ? 'white' : 'black', opacity: isDark ? 0.05 : 0.02 }]} pointerEvents="none" />

          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.title, { color: colors.text.primary }]}>REPORT INCIDENT</Text>
                <Text style={[styles.subtitle, { color: colors.text.muted }]}>Our AI agents are standing by to analyze signals</Text>
              </View>
              <ThemeToggle />
            </View>
          </View>

          {detectedLang && (
            <View style={[styles.langBanner, { backgroundColor: colors.status.info + '15' }]}>
              <Ionicons name="language" size={12} color={colors.status.info} />
              <Text style={[styles.langText, { color: colors.status.info }]}>{detectedLang}</Text>
            </View>
          )}

          <View style={[
            styles.inputWrapper, 
            { backgroundColor: colors.bg.surface, borderColor: colors.bg.border },
            isFocused && styles.inputFocused
          ]}>
            <TextInput
              style={[styles.textInput, { color: colors.text.primary }]}
              multiline
              placeholder="Describe what's happening..."
              placeholderTextColor={colors.text.disabled}
              value={text}
              onChangeText={setText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <TouchableOpacity 
              style={[styles.voiceBtn, { backgroundColor: colors.bg.card, borderColor: colors.bg.border }]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsListening(!isListening);
              }}
            >
              <Ionicons name="mic" size={24} color={isListening ? '#FF4444' : colors.text.muted} />
            </TouchableOpacity>
          </View>

          {isListening && <VoiceWaves />}

          <Text style={[styles.label, { color: colors.text.muted }]}>SIGNAL TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {SIGNAL_TYPES.map(type => (
              <TouchableOpacity 
                key={type.id} 
                onPress={() => setSignalType(type.id)}
                style={[
                  styles.chip, 
                  { backgroundColor: colors.bg.surface, borderColor: colors.bg.border },
                  signalType === type.id && styles.activeChip
                ]}
              >
                <Text style={styles.chipIcon}>{type.icon}</Text>
                <Text style={[
                  styles.chipLabel, 
                  { color: colors.text.secondary },
                  signalType === type.id && styles.activeChipLabel
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={styles.analyzeWrapper} 
            onPress={runAnalysis}
            disabled={loading || !text.trim()}
          >
            <LinearGradient
              colors={isDark ? ['#FF4444', '#FF8C00'] : ['#FF2D55', '#FF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.analyzeBtn}
            >
              <Text style={styles.analyzeText}>
                {loading ? 'AGENT PIPELINE ACTIVE...' : 'ANALYZE WITH AI'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingSection}>
              <LoadingAgents currentStep={currentStep} />
            </View>
          )}

          {!loading && (
            <View style={styles.scenarioSection}>
              <Text style={[styles.label, { color: colors.text.muted }]}>QUICK SCENARIOS</Text>
              <ScenarioButton 
                title="Flood — G10" 
                subtitle="Urban flooding reported near Markaz" 
                color={colors.severity.critical.text}
                onPress={() => handleScenario('flood_g10')}
              />
              <ScenarioButton 
                title="Power Outage — F7" 
                subtitle="Grid failure affecting sector F-7" 
                color={colors.severity.medium.text}
                onPress={() => handleScenario('power_f7')}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  langBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  langText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 150,
    padding: 16,
    marginBottom: 20,
  },
  inputFocused: {
    borderColor: '#FF4444',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  voiceBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 20,
    gap: 4,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#FF4444',
    borderRadius: 2,
  },
  listeningText: {
    marginLeft: 12,
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 12,
  },
  chipScroll: {
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
  },
  activeChip: {
    borderColor: '#FF4444',
    backgroundColor: '#FF444415',
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipLabel: {
    color: '#FF4444',
  },
  analyzeWrapper: {
    marginBottom: 30,
  },
  analyzeBtn: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  loadingSection: {
    marginBottom: 30,
  },
  scenarioSection: {
    marginTop: 10,
  }
});

