import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform, Linking, Animated, StatusBar, ScrollView
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';
import socketService from '../../services/socketService';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

const { height, width } = Dimensions.get('window');

// ── Captain Navy/Teal Brand ──────────────────────
const NAVY = '#0F172A';
const TEAL = '#0D9488';
const TEAL_LIGHT = '#00D4AA';

// Dark Mode Map Style
const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const LiveManagementScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { tripId } = route.params;
  const { location, startTracking, stopTracking } = useLocation();
  const [trip, setTrip] = useState<Trip | null>(null);
  const mapRef = useRef<MapView>(null);
  const trackingInterval = useRef<any>(null);
  
  // Animation for the live pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTrip();
    socketService.joinTripRoom(tripId);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();

    // Start captain location tracking
    startTracking(async (coords) => {
      try {
        await tripService.updateTripLocation(tripId, [coords.longitude, coords.latitude]);
        socketService.updateLocation({ tripId, coordinates: [coords.longitude, coords.latitude] });
        
        // Optionally animate camera to follow user smoothly
        if (mapRef.current && Platform.OS === 'ios') {
           mapRef.current.animateCamera({ center: { latitude: coords.latitude, longitude: coords.longitude } });
        }
      } catch {}
    });

    trackingInterval.current = setInterval(loadTrip, 30000);

    return () => {
      stopTracking();
      socketService.leaveTripRoom(tripId);
      clearInterval(trackingInterval.current);
    };
  }, []);

  const loadTrip = async () => {
    try {
      const res = await tripService.getTripById(tripId);
      setTrip(res.data.data);
    } catch {}
  };

  const handleEndTrip = () => {
    Alert.alert('إنهاء الرحلة نهائياً', 'هل قمت بتوصيل جميع الركاب؟', [
      { text: 'تراجع', style: 'cancel' },
      {
        text: 'إنهاء', style: 'destructive', onPress: async () => {
          await tripService.updateTripStatus(tripId, 'completed');
          stopTracking();
          navigation.goBack();
        }
      },
    ]);
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `comgooglemaps://?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) Linking.openURL(url);
        else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      });
    }
  };

  const routeCoords = trip?.route?.map(pt => ({ latitude: pt[1], longitude: pt[0] })) || [];
  const passengers = trip?.passengers?.filter(p => ['confirmed', 'waiting', 'picked_up'].includes(p.status)) || [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapDarkStyle}
        style={styles.map}
        initialRegion={location ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 } : { latitude: 31.9539, longitude: 35.9106, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsUserLocation={false} 
      >
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor={TEAL} strokeWidth={4} />
        )}
        
        {location && (
          <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
             <View style={styles.markerContainer}>
               <Animated.View style={[styles.markerPulse, { transform: [{ scale: pulseAnim }] }]} />
               <View style={styles.markerCore}>
                 <Ionicons name="car-sport" size={20} color="#FFF" />
               </View>
             </View>
          </Marker>
        )}

        {passengers.map((p) => {
          if (p.status === 'picked_up') return null; // Hide if already in car
          return (
            <Marker key={p._id} coordinate={{ latitude: p.pickupLocation.coordinates[1], longitude: p.pickupLocation.coordinates[0] }}>
              <View style={[styles.passengerPin, { backgroundColor: '#F97316' }]}>
                 <Ionicons name="person" size={14} color="#FFF" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top Gradient Overlay */}
      <LinearGradient colors={['rgba(15,23,42,0.9)', 'transparent']} style={styles.topGradient} pointerEvents="none" />

      {/* Header Actions */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.recenterBtn} onPress={() => {
           if (location) {
             mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 1000);
           }
        }}>
          <Ionicons name="locate" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>

      {/* Floating Status Bar */}
      <View style={styles.statusFloat}>
         <View style={styles.liveCircle}>
           <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
         </View>
         <Text style={styles.statusTxt}>تتبع حي للرحلة مستمر • في الطريق</Text>
      </View>

      {/* ── Glass Bottom Sheet ── */}
      <View style={styles.bottomSheet}>
         <LinearGradient colors={['rgba(26,31,60,0.95)', 'rgba(15,23,42,1)']} style={StyleSheet.absoluteFillObject} />
         <View style={styles.glassHighlight} />

         <Text style={styles.sheetTitle}>إدارة الركاب النشطين</Text>
         
         <ScrollView style={styles.passengerList} showsVerticalScrollIndicator={false}>
            {passengers.length === 0 ? (
               <Text style={styles.emptyTxt}>لا يوجد ركاب حالياً للمتابعة.</Text>
            ) : (
               passengers.map(p => (
                 <View key={p._id} style={styles.passengerCard}>
                   <View style={styles.pInfoRow}>
                     <View style={styles.avatarWrap}>
                       <Text style={styles.avatarTxt}>{p.user.name?.charAt(0) || 'ر'}</Text>
                     </View>
                     <View>
                        <Text style={styles.pName}>{p.user.name}</Text>
                        <Text style={styles.pStatus}>{p.status === 'picked_up' ? 'في السيارة' : 'بانتظار ركوبه'}</Text>
                     </View>
                   </View>

                   <View style={styles.pActionsRow}>
                     <TouchableOpacity style={styles.actionIconBtn} onPress={() => openGoogleMaps(p.pickupLocation.coordinates[1], p.pickupLocation.coordinates[0])}>
                       <Ionicons name="navigate-circle-outline" size={32} color={TEAL} />
                     </TouchableOpacity>
                     
                     <TouchableOpacity style={styles.actionIconBtn} onPress={() => navigation.navigate('Chat', { userId: p.user._id, userName: p.user.name, tripId })}>
                       <Ionicons name="chatbubble-ellipses-outline" size={28} color="#3B82F6" />
                     </TouchableOpacity>
                     
                     <TouchableOpacity style={[styles.stateBtn, { backgroundColor: p.status === 'picked_up' ? 'rgba(239,68,68,0.1)' : 'rgba(13,148,136,0.15)' }]} onPress={() => {}}>
                       <Text style={[styles.stateBtnTxt, { color: p.status === 'picked_up' ? '#EF4444' : TEAL }]}>
                         {p.status === 'picked_up' ? 'إنزال الراكب' : 'تم الركوب'}
                       </Text>
                     </TouchableOpacity>
                   </View>
                 </View>
               ))
            )}
         </ScrollView>

         {/* Actions */}
         <View style={styles.bottomActions}>
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' }]} 
              activeOpacity={0.8}
              onPress={handleEndTrip}
            >
              <Text style={[styles.primaryBtnTxt, { color: '#EF4444' }]}>إنهاء الرحلة نهائياً</Text>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  map: { ...StyleSheet.absoluteFillObject },
  
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60 },
  markerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(13,148,136,0.3)' },
  markerCore: { width: 32, height: 32, borderRadius: 16, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', ...SHADOWS.medium },

  passengerPin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', ...SHADOWS.medium },

  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },

  header: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 45, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  recenterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium },

  statusFloat: {
    position: 'absolute', top: Platform.OS === 'ios' ? 120 : 100, alignSelf: 'center',
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  liveCircle: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  statusTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
    maxHeight: height * 0.5,
  },
  glassHighlight: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 16 },

  emptyTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: 20, fontWeight: '600' },

  passengerList: { marginHorizontal: -5 },
  passengerCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12, marginHorizontal: 5 },
  
  pInfoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: '900', color: '#F97316' },
  pName: { fontSize: 15, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  pStatus: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },

  pActionsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stateBtn: { flex: 1, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  stateBtnTxt: { fontSize: 13, fontWeight: '800' },

  bottomActions: { marginTop: 16 },
  primaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, borderWidth: 1.5 },
  primaryBtnTxt: { fontSize: 15, fontWeight: '800' },
});

export default LiveManagementScreen;
