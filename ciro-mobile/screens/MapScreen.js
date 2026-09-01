import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Animated, ScrollView, useWindowDimensions, Platform, StatusBar 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';


const RESCUE_UNITS = [
  { id: 't1', name: 'Rescue Unit Alpha', icon: 'medkit', status: 'EN ROUTE', eta: '4 min', pos: { top: '35%', left: '20%' } },
  { id: 't2', name: 'Fire Response B', icon: 'flame', status: 'DEPLOYED', eta: '2 min', pos: { top: '55%', left: '60%' } },
  { id: 't3', name: 'Medical Team PIMS', icon: 'medical', status: 'STANDBY', eta: '8 min', pos: { top: '25%', left: '75%' } },
];

function PulsingMarker() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={styles.markerContainer}>
      <Animated.View style={[styles.pulse, { transform: [{ scale }], opacity }]} />
      <View style={styles.dot} />
    </View>
  );
}

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [selectedUnit, setSelectedUnit] = useState(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true
    }).start(() => setSelectedUnit(null));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Mock Map Background */}
      <View style={[styles.mapBg, { backgroundColor: isDark ? '#0D1424' : '#E2E8F0' }]}>
        {/* Grid lines */}
        {[...Array(10)].map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: `${i * 10}%`, backgroundColor: isDark ? '#1C2333' : '#D1D9E6' }]} />
        ))}
        {[...Array(10)].map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: `${i * 10}%`, backgroundColor: isDark ? '#1C2333' : '#D1D9E6' }]} />
        ))}

        {/* Alt Route Polyline */}
        <View style={[styles.altRoute, { width: width * 0.6 }]} />

        {/* Crisis Point */}
        <View style={[styles.markerPos, { top: '45%', left: '45%' }]}>
          <PulsingMarker />
          <View style={styles.crisisLabel}>
            <Text style={styles.crisisText}>G-10 FLOODING</Text>
          </View>
        </View>

        {/* Rescue Units */}
        {RESCUE_UNITS.map(unit => (
          <TouchableOpacity 
            key={unit.id} 
            style={[styles.unitMarker, unit.pos]}
            onPress={() => handleUnitSelect(unit)}
          >
            <Ionicons name={unit.icon} size={20} color="white" />
            <View style={styles.unitTail} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Header Overlay */}
      <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.header, { borderColor: colors.bg.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE INTEL</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>G-10 ISLAMABAD — SECTOR G</Text>
          </View>
          <ThemeToggle />
        </View>
        <Text style={[styles.headerSub, { color: colors.text.muted }]}>3 RESCUE UNITS IN TRANSIT</Text>
      </BlurView>

      {/* Legend Card */}
      {!selectedUnit && (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={[styles.legend, { borderColor: colors.bg.border }]}>
          <Text style={[styles.legendTitle, { color: colors.text.muted }]}>MAP LEGEND</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
              <Text style={styles.legendLabel}>Crisis</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4A9EFF' }]} />
              <Text style={styles.legendLabel}>Unit</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.status.success }]} />
              <Text style={[styles.legendLabel, { color: colors.text.primary }]}>Alt Route</Text>
            </View>
          </View>
        </BlurView>
      )}

      {/* Detail Bottom Sheet */}
      {selectedUnit && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={[styles.sheetBlur, { borderTopColor: colors.bg.border }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={styles.unitIconCircle}>
                <Ionicons name={selectedUnit.icon} size={32} color="white" />
              </View>
              <View style={styles.unitHeaderInfo}>
                <Text style={[styles.unitName, { color: colors.text.primary }]}>{selectedUnit.name}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{selectedUnit.status}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetStats}>
              <View style={[styles.sheetStatBox, { backgroundColor: isDark ? '#FFFFFF08' : '#00000008' }]}>
                <Text style={[styles.statVal, { color: colors.text.primary }]}>{selectedUnit.eta}</Text>
                <Text style={styles.statLab}>EST. ARRIVAL</Text>
              </View>
              <View style={[styles.sheetStatBox, { backgroundColor: isDark ? '#FFFFFF08' : '#00000008' }]}>
                <Text style={[styles.statVal, { color: colors.text.primary }]}>84%</Text>
                <Text style={styles.statLab}>FUEL LEVEL</Text>
              </View>
              <View style={[styles.sheetStatBox, { backgroundColor: isDark ? '#FFFFFF08' : '#00000008' }]}>
                <Text style={[styles.statVal, { color: colors.text.primary }]}>4.2km</Text>
                <Text style={styles.statLab}>DISTANCE</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.trackBtn}>
              <LinearGradient 
                colors={['#4A9EFF', '#3A8EE6']} 
                style={styles.trackBtnGradient}
              >
                <Text style={styles.trackBtnText}>TRACK LIVE TELEMETRY</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  mapBg: {
    flex: 1,
    backgroundColor: '#0D1424',
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#1C2333',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#1C2333',
  },
  altRoute: {
    position: 'absolute',
    top: '50%',
    left: '20%',
    height: 4,
    backgroundColor: '#00D084',
    borderRadius: 2,
    opacity: 0.4,
    transform: [{ rotate: '-15deg' }],
  },
  markerPos: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF4444',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: 'white',
  },
  crisisLabel: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  crisisText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unitMarker: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
  },
  unitTail: {
    position: 'absolute',
    bottom: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#4A9EFF',
    transform: [{ rotate: '180deg' }],
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF15',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF444422',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF444433',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  liveText: {
    color: '#FF4444',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerSub: {
    color: '#8892A4',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1,
  },
  legend: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF15',
  },
  legendTitle: {
    color: '#8892A4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  sheetBlur: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF22',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#FFFFFF22',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  unitIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A9EFF22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A9EFF44',
  },
  unitHeaderInfo: {
    flex: 1,
  },
  unitName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  statusBadge: {
    backgroundColor: '#4A9EFF22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusText: {
    color: '#4A9EFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 8,
  },
  sheetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sheetStatBox: {
    backgroundColor: '#FFFFFF08',
    padding: 12,
    borderRadius: 12,
    width: '30%',
    alignItems: 'center',
  },
  statVal: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  statLab: {
    color: '#8892A4',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
  trackBtn: {
    width: '100%',
    height: 54,
  },
  trackBtnGradient: {
    flex: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});
