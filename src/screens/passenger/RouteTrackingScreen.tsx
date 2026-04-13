import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, Dimensions, Animated, Alert, ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { permanentRouteService, PermanentRoute } from '../../services/permanentRouteService';
import socketService from '../../services/socketService';

const { height } = Dimensions.get('window');
const NAVY       = '#0F172A';
const VIOLET     = '#7C3AED';
const VIOLET_LT  = '#A78BFA';
const ORANGE     = '#F97316';
const GREEN      = '#10B981';
const BLUE       = '#3B82F6';

const DAYS_AR: Record<string, string> = {
  sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء',
  wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
};

const darkMapStyle = [
  { elementType: 'geometry',             stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#746855' }] },
  { featureType: 'road', elementType: 'geometry',        stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke',  stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water', elementType: 'geometry',       stylers: [{ color: '#17263c' }] },
  { featureType: 'poi.park', elementType: 'geometry',    stylers: [{ color: '#263c3f' }] },
];

type ViewMode = 'map' | 'info';

const RouteTrackingScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { routeId, bookingId } = route.params as { routeId: string; bookingId?: string };

  const [routeData, setRouteData]   = useState<PermanentRoute | null>(null);
  const [captains, setCaptains]     = useState<any[]>([]);
  const [captainLocs, setCaptainLocs] = useState<Record<string, { lat: number; lng: number }>>({});
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState<ViewMode>('map');
  const [selectedCaptain, setSelectedCaptain] = useState<any>(null);

  const mapRef    = useRef<MapView>(null);
  const slideAnim = useRef(new Animated.Value(120)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Sheet slide-in ─────────────────────────────────
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true,
      tension: 55, friction: 8,
    }).start();
  }, []);

  // ── Bus pulse animation ─────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Load route & captains ───────────────────────────
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [routeId])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [routeRes, captainsRes] = await Promise.all([
        permanentRouteService.getRouteById(routeId),
        permanentRouteService.getRouteCaptains(routeId),
      ]);
      setRouteData(routeRes.data.data);
      setCaptains(captainsRes.data.data || []);

      // Fit map to route
      const rd = routeRes.data.data as PermanentRoute;
      if (rd?.startLocation && rd?.endLocation && mapRef.current) {
        const coords = [
          { latitude: rd.startLocation.coordinates[1], longitude: rd.startLocation.coordinates[0] },
          ...(rd.waypoints || []).map((wp: any) => ({ latitude: wp.coordinates[1], longitude: wp.coordinates[0] })),
          { latitude: rd.endLocation.coordinates[1], longitude: rd.endLocation.coordinates[0] },
        ];
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 40, bottom: height * 0.5, left: 40 },
          animated: true,
        });
      }
    } catch (err) {
      Alert.alert('خطأ', 'تعذّر تحميل بيانات المسار');
    } finally {
      setLoading(false);
    }
  };

  // ── Socket: تلقي مواقع الكباتن اللحظية على المسار ───
  useFocusEffect(
    useCallback(() => {
      // انضم لغرفة المسار
      socketService.emit('join_trip', routeId);

      socketService.on('route:captain_location', (data: { captainId: string; lat: number; lng: number }) => {
        setCaptainLocs(prev => ({
          ...prev,
          [data.captainId]: { lat: data.lat, lng: data.lng },
        }));
      });

      return () => {
        socketService.off('route:captain_location');
        socketService.emit('leave_trip', routeId);
      };
    }, [routeId])
  );

  // ── Helpers ─────────────────────────────────────────
  const getPolylineCoords = () => {
    if (!routeData) return [];
    return [
      { latitude: routeData.startLocation.coordinates[1], longitude: routeData.startLocation.coordinates[0] },
      ...(routeData.waypoints || []).map((wp: any) => ({
        latitude: wp.coordinates[1], longitude: wp.coordinates[0],
      })),
      { latitude: routeData.endLocation.coordinates[1], longitude: routeData.endLocation.coordinates[0] },
    ];
  };

  const getActiveCaptains = () =>
    captains.filter((c: any) => c.status === 'active');

  // ── Calculate ETA from departure time ──────────────
  const getETA = () => {
    if (!routeData?.departureTime) return '—';
    const [h, m] = routeData.departureTime.split(':').map(Number);
    const now = new Date();
    const departure = new Date();
    departure.setHours(h, m, 0, 0);
    const diff = Math.ceil((departure.getTime() - now.getTime()) / 60000);
    if (diff < 0) return 'انطلق المسار';
    if (diff === 0) return 'يغادر الآن!';
    return `${diff} دقيقة`;
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={VIOLET} />
      <Text style={styles.loadingTxt}>جاري تحميل بيانات المسار...</Text>
    </View>
  );

  const polyCoords = getPolylineCoords();
  const activeCaptains = getActiveCaptains();
  const eta = getETA();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude:      routeData?.startLocation.coordinates[1] || 31.9522,
          longitude:     routeData?.startLocation.coordinates[0] || 35.9334,
          latitudeDelta:  0.15,
          longitudeDelta: 0.15,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        pitchEnabled={false}
      >
        {/* Route Polyline */}
        {polyCoords.length > 1 && (
          <>
            {/* Shadow line */}
            <Polyline
              coordinates={polyCoords}
              strokeColor="rgba(124,58,237,0.2)"
              strokeWidth={12}
            />
            {/* Main line */}
            <Polyline
              coordinates={polyCoords}
              strokeColor={VIOLET}
              strokeWidth={4}
            />
          </>
        )}

        {/* Start Marker */}
        {routeData && (
          <Marker
            coordinate={{ latitude: routeData.startLocation.coordinates[1], longitude: routeData.startLocation.coordinates[0] }}
          >
            <View style={styles.startPin}>
              <Ionicons name="bus" size={16} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* End Marker */}
        {routeData && (
          <Marker
            coordinate={{ latitude: routeData.endLocation.coordinates[1], longitude: routeData.endLocation.coordinates[0] }}
          >
            <View style={styles.endPin}>
              <Ionicons name="flag" size={14} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Live Captain Markers */}
        {activeCaptains.map((sub: any) => {
          const captId = sub.captain._id;
          const loc = captainLocs[captId];
          if (!loc) return null;
          return (
            <Marker
              key={captId}
              coordinate={{ latitude: loc.lat, longitude: loc.lng }}
              onPress={() => setSelectedCaptain(sub.captain)}
            >
              <Animated.View style={[styles.captainBusPin, { transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="bus" size={18} color="#FFF" />
              </Animated.View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top Gradient */}
      <LinearGradient colors={['rgba(15,23,42,0.95)', 'transparent']} style={styles.topGrad} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerMid}>
          <Text style={styles.headerTitle} numberOfLines={1}>{routeData?.name || 'المسار الثابت'}</Text>
          <View style={styles.etaRow}>
            <Ionicons name="time" size={12} color={VIOLET_LT} />
            <Text style={styles.etaTxt}>{eta}</Text>
          </View>
        </View>

        {/* View toggle */}
        <View style={styles.toggleWrap}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map" size={14} color={viewMode === 'map' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'info' && styles.toggleBtnActive]}
            onPress={() => setViewMode('info')}
          >
            <Ionicons name="information-circle" size={14} color={viewMode === 'info' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Live Captain Badge (Map center-left) ── */}
      {Object.keys(captainLocs).length > 0 && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTxt}>{Object.keys(captainLocs).length} أتوبيس حيّ</Text>
        </View>
      )}

      {/* ── Bottom Sheet ── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['rgba(18,12,48,0.98)', '#0B0F1E']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.sheetGlow} />
        <View style={styles.handle} />

        {viewMode === 'map' ? (
          // ── MAP MODE: بطاقة المسار المختصرة ──────────────
          <View>
            {/* Route Quick Info */}
            <View style={styles.routeQuickCard}>
              <View style={styles.rqLeft}>
                <LinearGradient colors={[VIOLET, '#5B21B6']} style={styles.busIconWrap}>
                  <Ionicons name="bus" size={22} color="#FFF" />
                </LinearGradient>
              </View>
              <View style={styles.rqRight}>
                <Text style={styles.rqName}>{routeData?.name}</Text>
                <View style={styles.rqRow}>
                  <Ionicons name="location" size={12} color={GREEN} />
                  <Text style={styles.rqTxt} numberOfLines={1}>{routeData?.startLocation.address}</Text>
                </View>
                <View style={styles.rqRow}>
                  <Ionicons name="flag" size={12} color={ORANGE} />
                  <Text style={styles.rqTxt} numberOfLines={1}>{routeData?.endLocation.address}</Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={18} color={VIOLET_LT} />
                <Text style={styles.statVal}>{routeData?.departureTime}</Text>
                <Text style={styles.statLabel}>وقت الانطلاق</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={18} color={GREEN} />
                <Text style={styles.statVal}>{activeCaptains.length}</Text>
                <Text style={styles.statLabel}>كباتن متاحين</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={18} color={ORANGE} />
                <Text style={styles.statVal}>{routeData?.pricePerSeat}</Text>
                <Text style={styles.statLabel}>د.أ / رحلة</Text>
              </View>
            </View>

            {/* Days */}
            <View style={styles.daysRow}>
              {routeData?.daysOfWeek.map(day => (
                <View key={day} style={styles.dayChip}>
                  <Text style={styles.dayTxt}>{DAYS_AR[day] || day}</Text>
                </View>
              ))}
            </View>

            {/* Book CTA */}
            {!bookingId && (
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => navigation.navigate('TripDetails', { tripId: routeId, isPermanentRoute: true })}
                activeOpacity={0.9}
              >
                <LinearGradient colors={[VIOLET, '#5B21B6']} style={StyleSheet.absoluteFillObject} />
                <Ionicons name="ticket-outline" size={18} color="#FFF" />
                <Text style={styles.bookBtnTxt}>احجز مقعدك الآن</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // ── INFO MODE: قائمة الكباتن ─────────────────────
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>كباتن المسار ({activeCaptains.length})</Text>
            {activeCaptains.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="bus-outline" size={40} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyTxt}>لا يوجد كابتن مشترك حالياً</Text>
              </View>
            ) : (
              activeCaptains.map((sub: any) => {
                const isLive = !!captainLocs[sub.captain._id];
                return (
                  <View key={sub.captain._id} style={styles.captainRow}>
                    <View style={styles.captainAvatar}>
                      <Text style={styles.captainAvatarTxt}>
                        {sub.captain.name?.charAt(0)?.toUpperCase() || 'ك'}
                      </Text>
                    </View>
                    <View style={styles.captainInfo}>
                      <Text style={styles.captainName}>{sub.captain.name}</Text>
                      <View style={styles.captainMeta}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.captainRating}>
                          {Number(sub.captain.rating?.average ?? 0).toFixed(1)}
                        </Text>
                        {sub.captain.vehicle && (
                          <Text style={styles.captainVehicle}>
                            · {sub.captain.vehicle.model} {sub.captain.vehicle.plateNumber}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isLive && (
                      <View style={styles.liveBadgeSmall}>
                        <View style={styles.liveDotSmall} />
                        <Text style={styles.liveTxtSmall}>حيّ</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Route description */}
            {routeData?.description && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>عن هذا المسار</Text>
                <Text style={styles.descTxt}>{routeData.description}</Text>
              </>
            )}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  loadingWrap: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt:  { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 14 },

  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },

  // Header
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  etaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
  etaTxt: { fontSize: 11, color: VIOLET_LT, fontWeight: '800' },
  toggleWrap: {
    flexDirection: 'row', backgroundColor: 'rgba(124,58,237,0.2)',
    borderRadius: 12, padding: 3, gap: 2,
    borderWidth: 1, borderColor: VIOLET + '40',
  },
  toggleBtn: { width: 32, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: VIOLET },

  // Live Badge
  liveBadge: {
    position: 'absolute', top: Platform.OS === 'ios' ? 130 : 118,
    right: 16,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: GREEN + '40',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: GREEN,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  liveTxt: { fontSize: 12, color: GREEN, fontWeight: '800' },

  // Map Pins
  startPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: VIOLET, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 8,
  },
  endPin: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  captainBusPin: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 10,
  },

  // Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    overflow: 'hidden',
    maxHeight: height * 0.55,
    borderTopWidth: 1, borderColor: VIOLET + '30',
  },
  sheetGlow: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: 1, backgroundColor: 'rgba(167,139,250,0.3)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },

  // Route Quick Card
  routeQuickCard: {
    flexDirection: 'row-reverse', gap: 14,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 20, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: VIOLET + '25',
  },
  rqLeft: { justifyContent: 'center' },
  busIconWrap: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rqRight: { flex: 1, alignItems: 'flex-end', gap: 5 },
  rqName: { fontSize: 16, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  rqRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  rqTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '700', flex: 1, textAlign: 'right' },

  // Stats
  statsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statVal:   { fontSize: 16, fontWeight: '900', color: '#FFF' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },

  // Days
  daysRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  dayChip: {
    backgroundColor: VIOLET + '18', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: VIOLET + '35',
  },
  dayTxt: { fontSize: 11, fontWeight: '800', color: VIOLET_LT },

  // Book button
  bookBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 20, overflow: 'hidden',
    elevation: 6,
  },
  bookBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '900' },

  // Info mode
  sectionTitle: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  emptyTxt:  { color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700' },

  captainRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  captainAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: VIOLET + '30',
    borderWidth: 1.5, borderColor: VIOLET + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  captainAvatarTxt: { fontSize: 18, fontWeight: '900', color: VIOLET_LT },
  captainInfo: { flex: 1, alignItems: 'flex-end' },
  captainName:   { fontSize: 14, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 4 },
  captainMeta:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  captainRating: { fontSize: 12, color: '#F59E0B', fontWeight: '800' },
  captainVehicle:{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  liveBadgeSmall: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: GREEN + '18', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: GREEN + '40' },
  liveDotSmall:   { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveTxtSmall:   { fontSize: 10, color: GREEN, fontWeight: '800' },

  descTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20, fontWeight: '600', textAlign: 'right' },
});

export default RouteTrackingScreen;
