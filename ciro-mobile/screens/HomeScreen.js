import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Animated, StatusBar, RefreshControl, useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import SignalCard from '../components/SignalCard';
import ThemeToggle from '../components/ThemeToggle';
import { getMockSignals } from '../services/apiService';

function PulsingDot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />;
}

function WeatherWidget() {
  const { colors } = useTheme();
  return (
    <View style={[styles.weatherStrip, { borderTopColor: colors.bg.border + '33' }]}>
      <View style={styles.weatherItem}>
        <Ionicons name="thermometer-outline" size={16} color={colors.text.secondary} />
        <Text style={[styles.weatherText, { color: colors.text.secondary }]}>28°C</Text>
      </View>
      <View style={styles.weatherItem}>
        <Ionicons name="rainy-outline" size={16} color={colors.text.secondary} />
        <Text style={[styles.weatherText, { color: colors.text.secondary }]}>15% Rain</Text>
      </View>
      <View style={styles.weatherItem}>
        <Ionicons name="speedometer-outline" size={16} color={colors.text.secondary} />
        <Text style={[styles.weatherText, { color: colors.text.secondary }]}>12 km/h Wind</Text>
      </View>
    </View>
  );
}

function RadarGraphic() {
  const { colors, isDark } = useTheme();
  const radarAnim1 = useRef(new Animated.Value(0)).current;
  const radarAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(radarAnim1, { toValue: 1, duration: 2500, useNativeDriver: true })
    ).start();

    const timer = setTimeout(() => {
      Animated.loop(
        Animated.timing(radarAnim2, { toValue: 1, duration: 2500, useNativeDriver: true })
      ).start();
    }, 1250);

    return () => clearTimeout(timer);
  }, []);

  const scale1 = radarAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const opacity1 = radarAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  
  const scale2 = radarAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2] });
  const opacity2 = radarAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.radarContainer}>
      <Animated.View style={[styles.radarRing, { transform: [{ scale: scale1 }], opacity: opacity1, borderColor: isDark ? '#FF444433' : '#FF444415' }]} />
      <Animated.View style={[styles.radarRing, { transform: [{ scale: scale2 }], opacity: opacity2, borderColor: isDark ? '#FF444433' : '#FF444415' }]} />
      <Ionicons name="navigate" size={40} color={colors.severity.critical.text} />
      <Text style={[styles.radarText, { color: colors.text.muted }]}>Scanning for signals...</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [signals, setSignals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchSignals = async () => {
    setRefreshing(true);
    const data = await getMockSignals();
    setSignals(data);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchSignals();
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.bg.card }, !isDark && styles.headerLight]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: colors.text.primary }]}>ISLAMABAD</Text>
            <View style={[styles.liveBadge, !isDark && styles.liveBadgeLight]}>
              <PulsingDot />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemeToggle />
            <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
              <View style={styles.profileBtn}>
                <Ionicons name="person-circle" size={32} color={colors.text.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <WeatherWidget />
      </SafeAreaView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0A0E1A" : "#F5F7FA"} />
      
      {/* List */}
      <Animated.FlatList
        data={signals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Animated.View style={{ 
            transform: [
              { translateX: scrollY.interpolate({ 
                inputRange: [-1, 0, index * 100], 
                outputRange: [0, 0, 0], 
                extrapolate: 'clamp' 
              }) }
            ]
          }}>
            <SignalCard signal={item} />
          </Animated.View>
        )}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        ListEmptyComponent={<RadarGraphic />}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#FF4444"
            title="Syncing signals..."
            titleColor={colors.text.muted}
          />
        }
      />

      {/* Sticky Header */}
      <View style={styles.headerContainer}>
        {renderHeader()}
      </View>

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: '#FF4444' }]} 
        onPress={() => navigation.navigate('Report')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingBottom: 12,
  },
  headerLight: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D9E6',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeLight: {
    backgroundColor: '#FFE5E8',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF4444',
    letterSpacing: 1,
  },
  weatherStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 140, // Height of header
    paddingBottom: 100,
  },
  radarContainer: {
    flex: 1,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
  },
  radarText: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  }
});

