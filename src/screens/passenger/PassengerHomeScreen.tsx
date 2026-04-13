import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions, Platform, StatusBar, ImageBackground,
  Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

const { width } = Dimensions.get('window');

// ── Passenger Brand Colors ──────────────────────────
const BLUE_ACCENT = '#3B82F6';
const BLUE_DARK = '#1D4ED8';
const TEAL = '#0D9488';
const ORANGE_ACCENT = '#F97316';
const NAVY = '#0F172A';

// Dark Map Style same as Captain
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

const PassengerHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { location, requestPermission } = useLocation();
  const { unreadNotifications, isConnected } = useSocket();
  const [nearbyTrips, setNearbyTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<MapView>(null);

  useFocusEffect(useCallback(() => {
    if (location) loadNearbyTrips();
    else requestPermission().then(ok => { if (ok) loadNearbyTrips(); });
  }, [location]));

  const loadNearbyTrips = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const res = await tripService.searchTrips({
        startLocation: { coordinates: [location.longitude, location.latitude] },
        maxDistance: 10,
      });
      setNearbyTrips(res.data.data.slice(0, 5));
    } catch {}
    setLoading(false);
  };

  const handleSwitchRole = () => {
    Alert.alert(
      '🔄 تبديل الدور',
      'هل تريد الانتقال إلى واجهة الكابتن؟',
      [
        { text: 'تراجع', style: 'cancel' },
        { text: 'نعم، انتقل', onPress: () => navigation.replace('CaptainApp') }
      ]
    );
  };

  const centerMap = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Premium Navy Background */}
      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      {/* ════════════ PREMIUM HEADER ════════════ */}
      <View style={styles.header}>
        <ImageBackground
          source={require('../../../assets/images/welcome_bg_3d.png')}
          style={StyleSheet.absoluteFillObject}
          imageStyle={{ opacity: 0.12 }}
        />
        <LinearGradient
          colors={['rgba(29,78,216,0.4)', 'rgba(15,23,42,0.95)', '#0F172A']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Top glow line */}
        <LinearGradient
          colors={[BLUE_ACCENT + '90', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.headerGlowLine}
        />

        <View style={styles.headerTop}>

          {/* ── RIGHT: User Avatar + Info ── */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('PassengerProfileScreen')}
              style={styles.avatarWrap}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[BLUE_ACCENT, BLUE_DARK]} style={styles.avatarGradient}>
                <Text style={styles.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || 'ر'}</Text>
              </LinearGradient>
              <View style={[styles.avatarRing, { borderColor: isConnected ? '#22C55E' : '#EF4444' }]} />
            </TouchableOpacity>

            <View style={styles.userInfoCol}>
              <Text style={styles.greeting} numberOfLines={1}>مرحباً، {user?.name?.split(' ')[0]}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22C55E' : '#EF4444' }]} />
                <Text style={styles.statusTxt}>{isConnected ? 'متصل · مباشر' : 'جاري الاتصال...'}</Text>
              </View>
            </View>
          </View>

          {/* ── LEFT: Logo + Action Buttons ── */}
          <View style={styles.headerLeft}>
            <View style={styles.actionIcons}>
              {user?.role === 'both' && (
                <TouchableOpacity onPress={handleSwitchRole} style={styles.iconBtn} activeOpacity={0.7}>
                  <Ionicons name="swap-horizontal" size={18} color={BLUE_ACCENT} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                style={styles.iconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={18} color="rgba(255,255,255,0.9)" />
                {unreadNotifications > 0 && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeNum}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* App Logo */}
            <View style={styles.logoWrap}>
              <LinearGradient colors={[BLUE_ACCENT, BLUE_DARK]} style={styles.logoGrad}>
                <Ionicons name="car-sport" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={styles.logoName}>خُذني معك</Text>
                <Text style={styles.logoSub}>راكب</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Global Search Bar */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.9} onPress={() => navigation.navigate('SearchTrips')}>
          <View style={styles.searchIconWrap}>
            <Ionicons name="search" size={20} color="#FFF" />
          </View>
          <Text style={styles.searchText}>إلى أين تريد الذهاب اليوم؟</Text>
        </TouchableOpacity>
      </View>


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mode Cards Row ── */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.modeCard, { backgroundColor: BLUE_ACCENT }]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('SearchTrips')}
          >
            <View style={[styles.modeCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
            <Ionicons name="location-outline" size={32} color="#FFF" style={styles.modeIcon} />
            <Text style={styles.modeTitle}>رحلة جماعية</Text>
            <Text style={styles.modeSub}>احجز مقعد مسبقاً</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.modeCard, { backgroundColor: ORANGE_ACCENT }]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('OnDemand')}
          >
            <View style={[styles.modeCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <Ionicons name="flash-outline" size={32} color="#FFF" style={styles.modeIcon} />
            <Text style={styles.modeTitle}>رحلة خاصة</Text>
            <Text style={styles.modeSub}>انطلق الآن</Text>
          </TouchableOpacity>
        </View>

        {/* ── Public Transit Banner ── */}
        <TouchableOpacity
          style={styles.transitBanner}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PermanentRoutesMap')}
        >
          <LinearGradient colors={['rgba(124, 58, 237, 0.95)', '#4C1D95']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.glassHighlight} />
          <View style={styles.transitBannerInner}>
             <View style={{ flex: 1 }}>
                <Text style={styles.transitBannerTitle}>المسارات الدائمة (باصات)</Text>
                <Text style={styles.transitBannerSub}>تصفح خطوط النقل الثابتة واحجز مقعدك على المسار مباشرة</Text>
             </View>
             <View style={styles.transitIconWrap}>
                 <Ionicons name="bus" size={28} color="#FFF" />
             </View>
          </View>
        </TouchableOpacity>

        {/* ── Map Section ── */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
            {location ? (
              <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                customMapStyle={darkMapStyle}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                showsUserLocation={true} 
                showsMyLocationButton={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {nearbyTrips.map((trip, idx) => (
                  <Marker
                    key={trip._id || idx.toString()}
                    coordinate={{
                      latitude: trip.startLocation.coordinates[1],
                      longitude: trip.startLocation.coordinates[0],
                    }}
                  >
                    <View style={styles.markerPin}>
                      <Ionicons name="car-sport" size={18} color="#FFF" />
                    </View>
                  </Marker>
                ))}
              </MapView>
            ) : (
              <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }]}>
                <ActivityIndicator size="large" color={BLUE_ACCENT} />
                <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontWeight: '700' }}>جاري تحديد موقعك المباشر📍...</Text>
              </View>
            )}
            
            {/* Overlay Gradient on Map for seamless blend */}
            <LinearGradient
              colors={['transparent', '#0F172ACC']}
              style={styles.mapGradientBottom}
              pointerEvents="none"
            />

            {/* Map Controls */}
            {location && (
              <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapBtn} activeOpacity={0.8} onPress={centerMap}>
                  <Ionicons name="locate" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── Suggested Trips ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity onPress={() => navigation.navigate('SearchTrips')}>
               <Text style={styles.linkTxt}>عرض المزيد</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>رحلات قريبة متاحة</Text>
          </View>
          
          {loading ? (
             <ActivityIndicator size="small" color={BLUE_ACCENT} style={{ marginTop: 20 }} />
          ) : nearbyTrips.length === 0 ? (
             <View style={styles.emptyWrap}>
                <Ionicons name="sad-outline" size={40} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyTxt}>لا توجد رحلات قريبة من موقعك حالياً. يمكنك البحث عن مسارات أخرى.</Text>
             </View>
          ) : (
            nearbyTrips.map(trip => (
              <TouchableOpacity key={trip._id} style={styles.glassCard} activeOpacity={0.8} onPress={() => navigation.navigate('TripDetails', { tripId: trip._id })}>
                 <View style={styles.glassHighlight} />
                 
                 <View style={styles.cardHeader}>
                   <View style={styles.priceWrap}>
                     <Text style={styles.priceNum}>{trip.pricePerSeat}</Text>
                     <Text style={styles.priceCur}>د.أ / مقعد</Text>
                   </View>
                   <View style={{ alignItems: 'flex-end' }}>
                     <Text style={styles.dateTxt}>{new Date(trip.departureTime).toLocaleDateString('ar', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                     <Text style={styles.timeTxt}>{new Date(trip.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
                   </View>
                 </View>

                 <View style={styles.routeCol}>
                   <View style={styles.routeItem}>
                      <Ionicons name="location-outline" size={16} color={BLUE_ACCENT} />
                      <Text style={styles.routeTxt} numberOfLines={1}>{trip.startLocation.address.split(',')[0]}</Text>
                   </View>
                   <View style={styles.routeItem}>
                      <Ionicons name="flag-outline" size={16} color={ORANGE_ACCENT} />
                      <Text style={styles.routeTxt} numberOfLines={1}>{trip.endLocation.address.split(',')[0]}</Text>
                   </View>
                 </View>
                 
                 <View style={styles.cardFooter}>
                   <View style={styles.seatPill}>
                     <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
                     <Text style={styles.seatTxt}>{trip.remainingSeats} مقاعد متاحة</Text>
                   </View>
                   <Text style={[styles.statusTxtCard, { color: BLUE_ACCENT }]}>احجز الآن</Text>
                 </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    overflow: 'hidden', position: 'relative',
    borderBottomWidth: 1, borderBottomColor: 'rgba(59,130,246,0.15)',
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20
  },
  headerGlowLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

  // RIGHT SIDE — Avatar
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  avatarWrap: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', position: 'relative' },
  avatarGradient: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarRing: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#0F172A', borderWidth: 2.5 },
  avatarTxt: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  userInfoCol: { alignItems: 'flex-end' },
  greeting: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', textAlign: 'right' },
  statusRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusTxt: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '700' },

  // LEFT SIDE — Logo + Icons
  headerLeft: { alignItems: 'flex-end', gap: 8 },
  actionIcons: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  badgeDot: { position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#0F172A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeNum: { color: '#FFF', fontSize: 8, fontWeight: '900' },

  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoGrad: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE_ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
  logoName: { fontSize: 16, fontWeight: '900', color: '#FFF', textAlign: 'left' },
  logoSub: { fontSize: 10, fontWeight: '700', color: BLUE_ACCENT, textAlign: 'left', marginTop: -1 },

  searchBar: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, height: 56, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
      android: { elevation: 6 }
    })
  },
  searchIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: BLUE_ACCENT, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  searchText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textAlign: 'right' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modeCard: {
    flex: 1, borderRadius: 24, padding: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', height: 130,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16
  },
  modeCircle: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60 },
  modeIcon: { marginBottom: 8 },
  modeTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', marginBottom: 2, textAlign: 'center' },
  modeSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },

  transitBanner: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.4)',
    elevation: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12
  },
  transitBannerInner: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20, gap: 16 },
  transitBannerTitle: { fontSize: 17, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 4 },
  transitBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textAlign: 'right', lineHeight: 18 },
  transitIconWrap: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },

  mapSection: { marginBottom: 30 },
  mapContainer: { width: '100%', height: 280, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  mapControls: { position: 'absolute', top: 16, right: 16, gap: 12, zIndex: 20 },
  mapBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,23,42,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  markerPin: { backgroundColor: ORANGE_ACCENT, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10, borderWidth: 2, borderColor: '#FFF' },

  section: { gap: 14, marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: BLUE_ACCENT },
  linkTxt: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  emptyTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },

  glassCard: {
    backgroundColor: 'rgba(25,30,55,0.5)', borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 14,
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateTxt: { fontSize: 13, fontWeight: '800', color: '#FFF', textAlign: 'left' },
  timeTxt: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textAlign: 'left', marginTop: 2 },
  
  priceWrap: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  priceNum: { fontSize: 20, fontWeight: '900', color: BLUE_ACCENT },
  priceCur: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: -2 },

  routeCol: { gap: 12, paddingRight: 4 },
  routeItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  routeTxt: { flex: 1, fontSize: 15, color: '#E2E8F0', fontWeight: '800', textAlign: 'right' },

  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  seatPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  seatTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  statusTxtCard: { fontSize: 13, fontWeight: '800' },
});

export default PassengerHomeScreen;
