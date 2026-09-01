import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

const MapComponent = ({ lat, lng, type, severity, zoom = 14 }) => {
  const position = [lat || 33.6844, lng || 73.0479];
  
  const getSeverityColor = () => {
    if (severity === 'CRITICAL') return '#FF4444';
    if (severity === 'HIGH') return '#FFA500';
    return '#44FF44';
  };

  return (
    <View style={styles.container}>
      <MapContainer center={position} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />
        <Marker position={position}>
          <Popup>
            <div style={{ color: '#000' }}>
              <strong>{type || 'Incident'}</strong><br/>
              {severity || 'Medium'} Severity
            </div>
          </Popup>
        </Marker>
        <Circle 
          center={position} 
          radius={500} 
          pathOptions={{ fillColor: getSeverityColor(), color: getSeverityColor(), fillOpacity: 0.3 }} 
        />
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252D3D',
    marginVertical: 10,
    zIndex: 0,
  },
});

export default MapComponent;
