import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, Animated, ActivityIndicator, StatusBar
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';
import socketService from '../../services/socketService';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

const { height, width } = Dimensions.get('window');

// ── Passenger Navy Brand ──────────────────────────
const NAVY = '#0F172A';
const BLUE_ACCENT = '#3B82F6';
const ORANGE_ACCENT = '#F97316';

// Dark Mode Map Style
const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
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

const LiveTrackingScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [captainCoords, setCaptainCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [status, setStatus] = useState('');
  
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tripId) {
      loadTrip();
      socketService.joinTripRoom(tripId);
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    ).start();

    // Listen to real-time captain location
    socketService.on('location_updated', (data: any) => {
      const coords = { latitude: data.coordinates[1], longitude: data.coordinates[0] };
      setCaptainCoords(coords);
      // Animate map to keep captain in view smoothly
      if (Platform.OS === 'ios') {
         mapRef.current?.animateCamera({ center: coords });
      } else {
         mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 1000);
      }
    });

    socketService.on('passenger_status_updated', (data: any) => {
      setStatus(data.status);
      if (data.status === 'picked_up') Alert.alert('🚗 انطلقت الرحلة', 'انطلقت رحلتك، نتمنى لك طريقاً آمناً.');
      if (data.status === 'dropped_off') {
        Alert.alert('🏁 الحمدلله على السلامة', 'لقد وصلت إلى وجهتك بنجاح.', [
          { text: 'مواصلة الدفع', onPress: () => {
            navigation.replace('Payment', { 
              tripId, 
              captainId: trip?.captain._id, 
              captainName: trip?.captain.name, 
              fare: trip?.pricePerSeat 
            });
          }},
        ]);
      }
    });

    socketService.on('trip_status_updated', (data: any) => {
      if (data.status === 'active') setStatus('in_progress');
      if (data.status === 'completed') setStatus('completed');
    });

    return () => {
      if (tripId) socketService.leaveTripRoom(tripId);
      socketService.off('location_updated');
      socketService.off('passenger_status_updated');
      socketService.off('trip_status_updated');
    };
  }, [tripId, trip]);

  const loadTrip = async () => {
    try {
      const res = await tripService.getTripById(tripId);
      setTrip(res.data.data);
      if (res.data.data.currentLocation) {
        setCaptainCoords({
          latitude: res.data.data.currentLocation.coordinates[1],
          longitude: res.data.data.currentLocation.coordinates[0],
        });
      }
    } catch {}
  };

  const routeCoords = trip?.route?.map(pt => ({ latitude: pt[1], longitude: pt[0] })) || [];
  
  const statusMessages: Record<string, string> = {
    scheduled: 'الرحلة مجدولة — ستبدأ في الموعد المحدد',
    active: 'الكابتن بدأ الرحلة وهو في الطريق إليك',
    waiting: 'الكابتن متوجه الآن لاستلامك...',
    in_progress: 'أنت الآن في الطريق — مسار آمن',
    completed: 'انتهت الرحلة بنجاح',
  };

  const initialRegion = captainCoords 
      ? { ...captainCoords, latitudeDelta: 0.08, longitudeDelta: 0.08 }
      : { latitude: 31.9539, longitude: 35.9106, latitudeDelta: 0.08, longitudeDelta: 0.08 };

  if (!trip) {
    return (
      <View style={styles.loadingWrap}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={BLUE_ACCENT} />
        <Text style={styles.loadingTxt}>جاري تهيئة التتبع المباشر...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapDarkStyle}
        style={styles.map}
        initialRegion={initialRegion}
      >
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#F97316" strokeWidth={4} />
        )}
        
        {captainCoords && (
          <Marker coordinate={captainCoords} anchor={{ x: 0.5, y: 0.5 }}>
             <View style={styles.markerContainer}>
               <Animated.View style={[styles.markerPulse, { transform: [{ scale: pulseAnim }] }]} />
               <View style={styles.markerCore}>
                 <Ionicons name="car-sport" size={20} color="#FFF" />
               </View>
             </View>
          </Marker>
        )}
      </MapView>

      {/* Top Gradient Overlay */}
      <LinearGradient colors={['rgba(15,23,42,0.9)', 'transparent']} style={styles.topGradient} pointerEvents="none" />

      {/* Header Actions */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.recenterBtn} onPress={() => {
           if (captainCoords) {
             mapRef.current?.animateToRegion({ ...captainCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 1000);
           }
        }}>
          <Ionicons name="locate" size={20} color={BLUE_ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Floating Status Bar */}
      <View style={styles.statusFloat}>
         <View style={[styles.statusDot, { backgroundColor: ORANGE_ACCENT }]} />
         <Text style={styles.statusTxt}>{statusMessages[status] || statusMessages['waiting']}</Text>
      </View>

      {/* ── Glass Bottom Sheet ── */}
      <View style={styles.bottomSheet}>
         <LinearGradient colors={['rgba(26,31,60,0.95)', 'rgba(15,23,42,1)']} style={StyleSheet.absoluteFillObject} />
         <View style={styles.glassHighlight} />

         <Text style={styles.sheetTitle}>تفاصيل الكابتن</Text>
         
         <View style={styles.captainCard}>
           <View style={styles.captainInfo}>
             <View style={styles.avatarWrap}>
               <Text style={styles.avatarTxt}>{trip.captain.name?.charAt(0) || 'ك'}</Text>
             </View>
             <View>
               <Text style={styles.captainName}>{trip.captain.name}</Text>
               <View style={styles.ratingRow}>
                 <Ionicons name="star" size={14} color="#F59E0B" />
                 <Text style={styles.ratingTxt}>{Number((trip.captain.rating as any)?.average ?? trip.captain.rating ?? 0).toFixed(1)}</Text>
               </View>
             </View>
           </View>
           
           <View style={styles.carInfo}>
             <Text style={styles.carModel}>{trip.captain.vehicle?.model || 'سيارة ركوب'}</Text>
             <View style={styles.plateWrap}>
               <Text style={styles.plateTxt}>{trip.captain.vehicle?.plateNumber || '----'}</Text>
             </View>
           </View>
         </View>

         {/* Actions */}
         <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: BLUE_ACCENT }]} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Chat', { userId: trip.captain._id, userName: trip.captain.name, tripId: trip._id })}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={BLUE_ACCENT} />
              <Text style={[styles.actionTxt, { color: BLUE_ACCENT }]}>تواصل</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dangerBtn} activeOpacity={0.8}>
               <Ionicons name="shield-half-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
         </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  loadingWrap: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13 },
  
  map: { ...StyleSheet.absoluteFillObject },
  
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 60, height: 60 },
  markerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(249,115,22,0.3)' },
  markerCore: { width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE_ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', ...SHADOWS.medium },

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
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', overflow: 'hidden'
  },
  glassHighlight: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  sheetTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 16 },

  captainCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  captainInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  avatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(249,115,22,0.15)', borderWidth: 1, borderColor: ORANGE_ACCENT, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: ORANGE_ACCENT },
  captainName: { fontSize: 15, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },

  carInfo: { alignItems: 'center' },
  carModel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4 },
  plateWrap: { backgroundColor: '#FCD34D', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  plateTxt: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  actionsRow: { flexDirection: 'row-reverse', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, borderWidth: 1.5 },
  actionTxt: { fontSize: 15, fontWeight: '800' },
  
  dangerBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.4)', alignItems: 'center', justifyContent: 'center' }
});

export default LiveTrackingScreen;
