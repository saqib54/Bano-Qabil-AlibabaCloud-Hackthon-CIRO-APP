import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Context & Theme
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Screens
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import InputScreen from './screens/InputScreen';
import MapScreen from './screens/MapScreen';
import DashboardScreen from './screens/DashboardScreen';
import CrisisDetailScreen from './screens/CrisisDetailScreen';
import SimulationScreen from './screens/SimulationScreen';
import AgentTraceScreen from './screens/AgentTraceScreen';
import ComparisonScreen from './screens/ComparisonScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Report') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Map') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'Dashboard') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF4444',
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.card,
          borderTopColor: colors.bg.border,
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Report" component={InputScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="CrisisDetail" component={CrisisDetailScreen} />
      <Stack.Screen name="Simulation" component={SimulationScreen} />
      <Stack.Screen name="AgentTrace" component={AgentTraceScreen} />
      <Stack.Screen name="Comparison" component={ComparisonScreen} />
    </Stack.Navigator>
  );
}

// Special wrapper for nested navigation used in InputScreen.js (Crises -> CrisisDetail)
function CrisesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CrisisDetail" component={CrisisDetailScreen} />
      <Stack.Screen name="Simulation" component={SimulationScreen} />
      <Stack.Screen name="AgentTrace" component={AgentTraceScreen} />
      <Stack.Screen name="Comparison" component={ComparisonScreen} />
    </Stack.Navigator>
  );
}

function NavigationRoot() {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isLoaded) {
    return <SplashScreen onFinish={() => setIsLoaded(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainStack} />
        {/* Added for compatibility with InputScreen's navigation.navigate('Crises', { screen: 'CrisisDetail' }) */}
        <Stack.Screen name="Crises" component={CrisesStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <NavigationRoot />
    </ThemeProvider>
  );
}
