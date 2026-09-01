import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

let MapView, Marker, Circle, PROVIDER_GOOGLE;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (e) {
  console.warn('MapView could not be loaded:', e.message);
}

const MapComponent = ({ lat, lng, type, severity }) => {
  // Fallback if MapView is not available in the binary
  if (!MapView) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={{ color: '#8892A4', fontWeight: '700' }}>📍 MAP LOADING / UNAVAILABLE</Text>
        <Text style={{ color: '#8892A4', fontSize: 10, marginTop: 4 }}>Please restart Expo Go app</Text>
      </View>
    );
  }

  const initialRegion = {
    latitude: lat || 33.6844,
    longitude: lng || 73.0479,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const getSeverityColor = () => {
    if (severity === 'CRITICAL') return '#FF4444';
    if (severity === 'HIGH') return '#FFA500';
    return '#44FF44';
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={initialRegion}
      >
        <Marker
          coordinate={{ latitude: lat || 33.6844, longitude: lng || 73.0479 }}
          title={type || 'Incident'}
          pinColor={getSeverityColor()}
        />
        <Circle
          center={{ latitude: lat || 33.6844, longitude: lng || 73.0479 }}
          radius={1000}
          fillColor={getSeverityColor() + '22'}
          strokeColor={getSeverityColor() + '66'}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  placeholder: {
    backgroundColor: '#161B22',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  map: { width: '100%', height: '100%' },
});

export default MapComponent;
