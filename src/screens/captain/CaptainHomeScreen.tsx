import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform, StatusBar, Dimensions, ImageBackground,
  Animated, Easing, Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { tripService } from '../../services/tripService';
import { onDemandService } from '../../services/onDemandService';
import { Trip } from '../../types';

const { width, height } = Dimensions.get('window');

// ── Captain Navy/Teal Brand ──────────────────────
const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const NAVY = '#0F172A';

// Dark Map Style (SnazzyMaps style)
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

const CaptainHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { unreadNotifications, isConnected, setCaptainAvailable, socket } = useSocket();
  const [incomingRide, setIncomingRide] = useState<any>(null);
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalTrips: 0, earnings: 0, rating: 0, completedTrips: 0 });
  const [isAvailable, setIsAvailable] = useState(false);
  const [captainLocation, setCaptainLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef = useRef<MapView>(null);
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Start Radar Animation when available
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isAvailable) {
      loop = Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      loop.start();
    } else {
      radarAnim.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isAvailable]);

  const centerMap = () => {
    if (captainLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: captainLocation.latitude,
        longitude: captainLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Listen to new fast ride requests
  useEffect(() => {
    if (!socket) return;
    const handleRideRequest = (ride: any) => {
      // Only show if captain is available
      if (isAvailable) {
        setIncomingRide(ride);
      }
    };
    socket.on('ride_request', handleRideRequest);
    return () => {
      socket.off('ride_request', handleRideRequest);
    };
  }, [socket, isAvailable]);

  const acceptIncomingRide = async () => {
    if (!incomingRide) return;
    try {
      const res = await onDemandService.acceptRide(incomingRide._id);
      setIncomingRide(null);
      // TASK-03: الانتقال لشاشة إدارة الرحلة الخاصة بعد القبول
      navigation.navigate('OnDemandManagement', {
        rideId:     incomingRide._id,
        initialRide: res?.data?.data ?? incomingRide,
      });
    } catch (err: any) {
      Alert.alert('عذراً', err.response?.data?.message || 'تم حجز الطلب من كابتن آخر أو تم إلغاؤه');
      setIncomingRide(null);
    }
  };

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          // Fallback for demonstration if denied
          if (isMounted) setCaptainLocation({ latitude: 31.9522, longitude: 35.9334 });
          return;
        }
        
        let initialLocation = await Location.getCurrentPositionAsync({});
        if (isMounted) setCaptainLocation({ latitude: initialLocation.coords.latitude, longitude: initialLocation.coords.longitude });

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            if (isMounted) setCaptainLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        );
      } catch (err) {
        console.warn('Location error:', err);
        if (isMounted) setCaptainLocation({ latitude: 31.9522, longitude: 35.9334 });
      }
    })();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const res = await tripService.getCaptainTrips();
      const allTrips: Trip[] = res.data.data;
      const completed = allTrips.filter((t: any) => t.status === 'completed');
      const active = allTrips.find((t: any) => t.status === 'active') || null;
      const upcoming = allTrips.filter((t: any) => t.status === 'scheduled').slice(0, 4);

      setActiveTrip(active);
      setTrips(upcoming);
      setStats({
        totalTrips: allTrips.length,
        completedTrips: completed.length,
        earnings: completed.length * 12.5,
        rating: Number((user?.rating as any)?.average ?? user?.rating) || 5.0,
      });
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const toggleAvailability = () => {
    const newState = !isAvailable;
    setIsAvailable(newState);
    setCaptainAvailable(newState);
    if (newState) {
      // Small haptic-like local feedback simulation (UI only here)
    }
  };

  const handleSwitchRole = () => {
    Alert.alert(
      '🔄 تبديل الدور',
      'هل تريد الانتقال إلى واجهة الراكب؟',
      [
        { text: 'تراجع', style: 'cancel' },
        { text: 'نعم، انتقل', onPress: () => navigation.replace('PassengerApp') }
      ]
    );
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={TEAL} />
      <Text style={styles.loadingText}>جاري تهيئة لوحة القيادة...</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Navy Background */}
      <View style={StyleSheet.absoluteFillObject}>
         <ImageBackground source={require('../../../assets/images/welcome_bg_3d.png')} style={StyleSheet.absoluteFillObject} imageStyle={{ opacity: 0.1 }} />
         <LinearGradient colors={['#0F172A', '#0B1120', '#0F172A']} style={StyleSheet.absoluteFillObject} />
      </View>

      {/* ════════════ PREMIUM MODERN NAVBAR ════════════ */}
      <View style={styles.header}>
        <View style={styles.headerGlassBase}>
            <LinearGradient
              colors={['rgba(20,184,166,0.15)', 'rgba(15,23,42,0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Top edge glow */}
            <View style={styles.headerGlowLine} />
            
            <View style={styles.headerTop}>
              {/* ── RIGHT: Avatar + Name (Arabic UI implies right-to-left visual balance, put avatar on right) ── */}
              <TouchableOpacity onPress={() => navigation.navigate('CaptainProfileScreen')} style={styles.avatarWrap} activeOpacity={0.85}>
                 <LinearGradient colors={[TEAL, '#065F46']} style={styles.avatarGradient}>
                   <Text style={styles.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || 'ك'}</Text>
                 </LinearGradient>
              </TouchableOpacity>

              <View style={styles.userInfoCol}>
                <Text style={styles.greeting} numberOfLines={1}>مرحباً، كابتن {user?.name?.split(' ')[0]}</Text>
                <View style={styles.statusBadge}>
                   <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />
                   <Text style={[styles.statusTxt, { color: isConnected ? '#10B981' : '#EF4444' }]}>{isConnected ? 'متصل' : 'مفصول'}</Text>
                </View>
              </View>

              <View style={{ flex: 1 }} />

              {/* ── LEFT: Actions ── */}
              <View style={styles.actionIcons}>
                {user?.role === 'both' && (
                  <TouchableOpacity onPress={handleSwitchRole} style={styles.navbarIconBox} activeOpacity={0.7}>
                    <Ionicons name="swap-horizontal" size={20} color={TEAL_LIGHT} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.navbarIconBox} activeOpacity={0.7}>
                  <Ionicons name="notifications" size={20} color="#E2E8F0" />
                  {unreadNotifications > 0 && (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeNum}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

            </View>
        </View>

        {/* ── Availability Toggle ── */}
        <TouchableOpacity
          style={[styles.availToggle, isAvailable && { borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.12)' }]}
          onPress={toggleAvailability}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isAvailable ? [TEAL, '#065F46'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
            style={styles.availCircle}
          >
            <Ionicons name={isAvailable ? 'flash' : 'power'} size={15} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.availTxt, isAvailable && { color: TEAL, fontWeight: '900' }]}>
            {isAvailable ? '● متاح للرحلات الفورية' : 'اضغط للتفعيل'}
          </Text>
          <View style={[styles.availBadge, { backgroundColor: isAvailable ? 'rgba(13,148,136,0.2)' : 'rgba(255,255,255,0.05)' }]}>
            <Text style={[styles.availBadgeTxt, { color: isAvailable ? TEAL : 'rgba(255,255,255,0.4)' }]}>
              {isAvailable ? 'فعّال' : 'معطّل'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        {/* ── Stats Glass Row ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard]}>
            <Ionicons name="wallet-outline" size={20} color={TEAL} style={styles.statIcon} />
            <Text style={styles.statVal}>{(stats.earnings ?? 0).toFixed(1)} <Text style={styles.statCurrency}>د.أ</Text></Text>
            <Text style={styles.statLabel}>أرباحك</Text>
          </View>
          <View style={[styles.statCard]}>
            <Ionicons name="car-sport-outline" size={20} color={TEAL} style={styles.statIcon} />
            <Text style={styles.statVal}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>رحلة مشتركة</Text>
          </View>
          <View style={[styles.statCard]}>
            <Ionicons name="star-outline" size={20} color="#F59E0B" style={styles.statIcon} />
            <Text style={styles.statVal}>{(stats.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={[styles.quickActionBox, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1 }]}
            onPress={() => navigation.navigate('AvailableRequests')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
              <Ionicons name="list" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickActionTxt}>طلبات الركاب</Text>
            <Text style={styles.quickActionSub}>استكشف الطلبات</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionBox, { backgroundColor: 'rgba(13,148,136,0.1)', borderColor: 'rgba(13,148,136,0.3)', borderWidth: 1 }]}
            onPress={() => navigation.navigate('CreateTrip')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconWrap, { backgroundColor: 'rgba(13,148,136,0.2)' }]}>
              <Ionicons name="add" size={24} color="#0D9488" />
            </View>
            <Text style={styles.quickActionTxt}>رحلة جديدة</Text>
            <Text style={styles.quickActionSub}>إنشاء مسار</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Trip / Map Area ── */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            {captainLocation ? (
              <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                customMapStyle={darkMapStyle}
                region={{
                  latitude: captainLocation.latitude,
                  longitude: captainLocation.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                showsUserLocation={false} 
                showsMyLocationButton={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker coordinate={captainLocation}>
                  <View style={styles.carMarker}>
                    <Ionicons name="car-sport" size={26} color="#FFFFFF" />
                  </View>
                </Marker>
              </MapView>
            ) : (
              <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }]}>
                <ActivityIndicator size="large" color="#14B8A6" />
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontWeight: '700' }}>جاري تحديد موقعك المباشر📍...</Text>
              </View>
            )}
            
            {/* Overlay Gradient on Map for seamless blend */}
            <LinearGradient
              colors={['transparent', '#0F172ACC']}
              style={styles.mapGradientBottom}
              pointerEvents="none"
            />

            {/* Radar Overlay (When Captain is Available) */}
            {isAvailable && (
              <View style={styles.radarOverlay} pointerEvents="none">
                <Animated.View style={[
                  styles.radarPulse,
                  {
                    transform: [
                      {
                        scale: radarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 4]
                        })
                      }
                    ],
                    opacity: radarAnim.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: [0.8, 0.1, 0]
                    })
                  }
                ]} />
                <View style={styles.radarTextWrap}>
                  <ActivityIndicator size="small" color="#14B8A6" />
                  <Text style={styles.radarText}>جاري البحث عن ركاب متطابقين...</Text>
                </View>
              </View>
            )}

            {/* Map Controls */}
            {captainLocation && (
              <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapBtn} activeOpacity={0.8} onPress={centerMap}>
                  <Ionicons name="locate" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapBtn} activeOpacity={0.8} onPress={() => {}}>
                  <Ionicons name="layers" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* If there is an active trip, float it ON the map! */}
            {activeTrip && (
              <TouchableOpacity
                style={styles.floatingActiveTrip}
                activeOpacity={0.95}
                onPress={() => navigation.navigate('LiveManagement', { tripId: activeTrip._id })}
              >
                <LinearGradient colors={['rgba(20,25,45,0.95)', 'rgba(15,23,42,0.95)']} style={StyleSheet.absoluteFillObject} />
                <View style={[styles.glassHighlight, { opacity: 0.2 }]} />
                
                <View style={styles.cardHeader}>
                  <View style={[styles.chip, { backgroundColor: TEAL_LIGHT }]}>
                    <Text style={styles.chipTxt}>رحلة حالية</Text>
                  </View>
                  <Text style={styles.timeTxt}>
                    {new Date(activeTrip.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.routeCol}>
                  <View style={styles.routeItem}>
                     <Ionicons name="location-outline" size={18} color={TEAL_LIGHT} />
                     <Text style={styles.routeTxt} numberOfLines={1}>{activeTrip.startLocation.address.split(',')[0]}</Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeItem}>
                     <Ionicons name="flag-outline" size={18} color="#F97316" />
                     <Text style={styles.routeTxt} numberOfLines={1}>{activeTrip.endLocation.address.split(',')[0]}</Text>
                  </View>
                </View>

                <View style={styles.activeTripAction}>
                  <Text style={[styles.btnOutlineTxt, { color: TEAL_LIGHT, flex: 1, textAlign: 'center' }]}>التتبع المباشر للرحلة</Text>
                  <Ionicons name="arrow-back-circle" size={24} color={TEAL_LIGHT} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Upcoming Trips ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => navigation.navigate('MyTrips')}>
              <Text style={styles.linkTxt}>عرض الكل</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>مجدولة قريباً</Text>
          </View>
          
          {trips.length === 0 ? (
             <View style={styles.emptyWrap}>
                <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyTxt}>لا توجد رحلات قادمة. استخدم الزر بالأسفل لإنشاء رحلة.</Text>
             </View>
          ) : (
            trips.map(trip => (
              <TouchableOpacity key={trip._id} style={styles.glassCard} activeOpacity={0.8} onPress={() => navigation.navigate('TripManagement', { tripId: trip._id })}>
                 <View style={styles.glassHighlight} />
                 
                 <View style={styles.cardHeader}>
                   <View style={styles.priceWrap}>
                     <Text style={styles.priceNum}>{trip.pricePerSeat > 0 ? trip.pricePerSeat : 'مجاني'}</Text>
                     <Text style={styles.priceCur}>{trip.pricePerSeat > 0 ? 'د.أ / مقعد' : ''}</Text>
                   </View>
                   <View style={{ alignItems: 'flex-end' }}>
                     <Text style={styles.dateTxt}>{new Date(trip.departureTime).toLocaleDateString('ar', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                     <Text style={styles.timeTxt}>{new Date(trip.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
                   </View>
                 </View>

                 <View style={styles.routeCol}>
                   <View style={styles.routeItem}>
                      <Ionicons name="location-outline" size={16} color={TEAL} />
                      <Text style={styles.routeTxt} numberOfLines={1}>{trip.startLocation.address.replace(/[\s,]/g, '').match(/^[-+]?\d+\.?\d*$/) ? 'موقع محدد على الخريطة' : trip.startLocation.address.split(',')[0]}</Text>
                   </View>
                   <View style={styles.routeItem}>
                      <Ionicons name="flag-outline" size={16} color="#F97316" />
                      <Text style={styles.routeTxt} numberOfLines={1}>{trip.endLocation.address.replace(/[\s,]/g, '').match(/^[-+]?\d+\.?\d*$/) ? 'موقع محدد على الخريطة' : trip.endLocation.address.split(',')[0]}</Text>
                   </View>
                 </View>
                 
                 <View style={styles.cardFooter}>
                   <View style={styles.seatPill}>
                     <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
                     <Text style={styles.seatTxt}>{trip.bookedSeats || 0} / {trip.availableSeats || 0} محجوز</Text>
                   </View>
                   <Text style={[styles.statusTxtCard, { color: TEAL }]}>إدارة الرحلة</Text>
                 </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Incoming Request Modal */}
      <Modal visible={!!incomingRide} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.ridePopup}>
            <Text style={styles.popupTitle}>🚨 طلب رحلة فورية جديد!</Text>
            
            <View style={styles.popupRow}>
              <Ionicons name="location" size={20} color={TEAL_LIGHT} />
              <Text style={styles.popupTxt}>{incomingRide?.pickupLocation?.address || 'موقع الركوب'}</Text>
            </View>
            <View style={styles.popupRow}>
              <Ionicons name="flag" size={20} color="#F97316" />
              <Text style={styles.popupTxt}>{incomingRide?.dropoffLocation?.address || 'الوجهة'}</Text>
            </View>
            <View style={styles.popupRow}>
              <Ionicons name="cash" size={20} color="#FFF" />
              <Text style={styles.popupTxt}>الدفع: {incomingRide?.paymentMethod === 'wallet' ? 'محفظة' : 'نقدي'}</Text>
            </View>
            
            <Text style={styles.popupPrice}>{incomingRide?.estimatedPrice} د.أ</Text>

            <View style={styles.popupBtns}>
              <TouchableOpacity style={[styles.popupBtn, styles.popupReject]} onPress={() => setIncomingRide(null)}>
                <Text style={styles.popupBtnRejectTxt}>تجاهل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.popupBtn, styles.popupAccept]} onPress={acceptIncomingRide}>
                <Text style={styles.popupBtnAcceptTxt}>قبول الطلب ✅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  loadingWrap: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 55 : 45,
    paddingBottom: 15, paddingHorizontal: 20, zIndex: 10,
    backgroundColor: 'transparent'
  },
  headerGlassBase: {
    borderRadius: 24, overflow: 'hidden', padding: 16,
    backgroundColor: 'rgba(15,23,42,0.6)', 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8
  },
  headerGlowLine: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, backgroundColor: TEAL, opacity: 0.5, shadowColor: TEAL, shadowOffset: { width:0, height:0}, shadowOpacity: 1, shadowRadius: 10 },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center' },

  avatarWrap: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', position: 'relative', marginLeft: 12 },
  avatarGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#0F172A' },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  
  userInfoCol: { alignItems: 'flex-end', justifyContent: 'center' },
  greeting: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', textAlign: 'right', marginBottom: 2 },
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: '800' },

  // LEFT SIDE — Logo + Icons
  actionIcons: { flexDirection: 'row-reverse', gap: 10 },
  navbarIconBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  badgeDot: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#0B1120', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeNum: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  // Availability Toggle
  availToggle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  availCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  availTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  availBadgeTxt: { fontSize: 11, fontWeight: '900' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statIcon: { marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: '900', color: '#F97316', marginBottom: 2 },
  statCurrency: { fontSize: 10, color: '#F97316', fontWeight: '700' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },

  section: { gap: 14, marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#F97316' },
  linkTxt: { fontSize: 13, color: TEAL, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  emptyTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12, fontWeight: '700', textAlign: 'center' },

  glassCard: {
    backgroundColor: 'rgba(25,30,55,0.5)', borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 14,
  },

  // Quick Actions Styles
  quickActionsRow: { flexDirection: 'row-reverse', gap: 12, marginBottom: 28 },
  quickActionBox: { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center' },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickActionTxt: { fontSize: 13, fontWeight: '900', color: '#FFF', marginBottom: 2 },
  quickActionSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },

  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipTxt: { color: '#1A1F3C', fontSize: 11, fontWeight: '800' },
  dateTxt: { fontSize: 13, fontWeight: '800', color: '#FFF', textAlign: 'left' },
  timeTxt: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textAlign: 'left', marginTop: 2 },
  
  priceWrap: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  priceNum: { fontSize: 20, fontWeight: '900', color: TEAL_LIGHT },
  priceCur: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: -2 },

  routeCol: { gap: 12, paddingRight: 4 },
  routeItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  routeLine: { width: 1.5, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, marginVertical: -4 },
  routeTxt: { flex: 1, fontSize: 15, color: '#E2E8F0', fontWeight: '800', textAlign: 'right' },

  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  seatPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  seatTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  statusTxtCard: { fontSize: 13, fontWeight: '800' },

  btnOutline: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, paddingVertical: 12 },
  btnOutlineTxt: { fontSize: 13, fontWeight: '800' },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  mapSection: { marginBottom: 30 },
  mapContainer: { width: '100%', height: 280, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  mapControls: { position: 'absolute', top: 16, right: 16, gap: 12, zIndex: 20 },
  mapBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,23,42,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  
  radarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(15,23,42,0.2)',
  },
  radarPulse: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#14B8A6',
    position: 'absolute',
  },
  radarTextWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#14B8A6',
    gap: 10,
    marginTop: 60, // Avoid covering the car in center
  },
  radarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  
  carMarker: {
    backgroundColor: '#14B8A6',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  ridePopup: {
    backgroundColor: '#151C2F', width: '100%', borderRadius: 28, padding: 24,
    borderWidth: 2, borderColor: TEAL_LIGHT, shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15
  },
  popupTitle: { fontSize: 22, color: '#FFF', fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  popupRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
  popupTxt: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '700', flex: 1, textAlign: 'right' },
  popupPrice: { fontSize: 32, color: '#F97316', fontWeight: '900', textAlign: 'center', marginVertical: 10 },
  popupBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
  popupBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  popupAccept: { backgroundColor: TEAL_LIGHT },
  popupReject: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444' },
  popupBtnAcceptTxt: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  popupBtnRejectTxt: { color: '#EF4444', fontSize: 16, fontWeight: '800' },
  floatingActiveTrip: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    borderRadius: 24, padding: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: TEAL_LIGHT + '50',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  activeTripAction: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(20,184,166,0.15)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, marginTop: 14 },
});

export default CaptainHomeScreen;
