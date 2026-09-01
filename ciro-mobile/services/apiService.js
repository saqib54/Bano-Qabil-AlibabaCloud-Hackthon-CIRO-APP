import { Platform } from 'react-native';
import { theme } from '../components/theme';

// Detect environment to use correct backend URL
// For physical devices, replace localhost with your machine's local IP (e.g., 192.168.x.x)
const BASE_URL = Platform.OS === 'web' 
  ? 'https://ciro-backend-388366922818.us-central1.run.app' 
  : 'https://ciro-backend-388366922818.us-central1.run.app';  

export const analyzeCrisis = async (signals, customText = '') => {
  try {
    const response = await fetch(`${BASE_URL}/api/crisis/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        signals: signals || [],
        custom_text: customText 
      }),
    });
    if (!response.ok) throw new Error('Backend failed');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
};

export const getMockSignals = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/signals/mock`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    return [
      { id: 's1', source: 'twitter', text: 'Heavy flooding in G-10 Islamabad! #Floods', severity: 'HIGH' },
      { id: 's2', source: 'resident_app', text: 'Cars stuck in water near Markaz', severity: 'CRITICAL' }
    ];
  }
};

export const getCrisisHistory = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/crisis/history`);
    if (!response.ok) return [];
    return await response.json();
  } catch (e) {
    return [];
  }
};

export const getStats = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/crisis/stats`);
    if (!response.ok) throw new Error();
    return await response.json();
  } catch (e) {
    return {
      activeCrises: 3,
      signalsToday: 145,
      actionsDone: 89,
      avgResponseTime: '14m'
    };
  }
};

export const getScenario = async (name) => {
  try {
    const response = await fetch(`${BASE_URL}/api/scenarios/${name}`);
    if (!response.ok) throw new Error();
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const getWSUrl = () => {
  return BASE_URL.replace('http', 'ws');
};
