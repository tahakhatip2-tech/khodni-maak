import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Platform, StatusBar, Dimensions, Easing, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import socketService from '../../services/socketService';
import { onDemandService } from '../../services/onDemandService';
import * as Location from 'expo-location';

const { height } = Dimensions.get('window');
const NAVY       = '#0F172A';
const TEAL       = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const ORANGE     = '#F97316';
const GREEN      = '#10B981';

// ── الحالات المتسلسلة ─────────────────────────────────
type RideAction = 'arrive' | 'start' | 'complete';
interface ActionConfig {
  label:       string;
  sublabel:    string;
  icon:        string;
  color:       string;
  bgColor:     string;
  action:      RideAction;
  confirmMsg:  string;
}

const ACTIONS: ActionConfig[] = [
  {
    action:     'arrive',
    label:      'وصلت لموقع الراكب',
    sublabel:   'اضغط عند الوصول لنقطة الالتقاء',
    icon:       'location',
    color:      TEAL_LIGHT,
    bgColor:    'rgba(20,184,166,0.12)',
    confirmMsg: 'هل وصلت لموقع الراكب؟',
  },
  {
    action:     'start',
    label:      'بدء الرحلة',
    sublabel:   'اضغط بعد صعود الراكب',
    icon:       'play-circle',
    color:      GREEN,
    bgColor:    'rgba(16,185,129,0.12)',
    confirmMsg: 'هل الراكب جاهز والرحلة تبدأ؟',
  },
  {
    action:     'complete',
    label:      'إنهاء الرحلة',
    sublabel:   'اضغط عند الوصول للوجهة',
    icon:       'flag',
    color:      ORANGE,
    bgColor:    'rgba(249,115,22,0.12)',
    confirmMsg: 'هل وصلتم للوجهة المطلوبة؟',
  },
];

const darkMapStyle = [
  { elementType: 'geometry',              stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#746855' }] },
  { featureType: 'road',  elementType: 'geometry',        stylers: [{ color: '#38414e' }] },
  { featureType: 'road',  elementType: 'geometry.stroke',  stylers: [{ color: '#212a37' }] },
  { featureType: 'road',  elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water', elementType: 'geometry',        stylers: [{ color: '#17263c' }] },
];

const OnDemandManagementScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { rideId, initialRide } = route.params as { rideId: string; initialRide: any };

  const [ride, setRide]         = useState<any>(initialRide || null);
  const [actionIndex, setActionIndex] = useState(0);   // 0=arrive, 1=start, 2=complete
  const [loading, setLoading]   = useState(false);
  const [captainLocation, setCaptainLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef   = useRef<MapView>(null);
  const radarAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  // ── Animate sheet ─────────────────────────────────────
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, []);

  // ── Radar animation (shown when actionIndex === 0) ────
  useEffect(() => {
    if (actionIndex === 0) {
      const loop = Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1, duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }
    radarAnim.setValue(0);
  }, [actionIndex]);

  // ── Load ride data ────────────────────────────────────
  useEffect(() => {
    if (!ride) {
      onDemandService.getRide(rideId)
        .then(r => setRide(r.data.data))
        .catch(() => {});
    }
  }, []);

  // ── GPS: إرسال موقع الكابتن المدمج — HTTP + Socket ────────
  useFocusEffect(
    useCallback(() => {
      let subscription: Location.LocationSubscription | null = null;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({});
        setCaptainLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 8 },
          (pos) => {
            setCaptainLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          }
        );

        // TASK-09: إرسال عبر Socket كل 6 ثواني (أسرع من HTTP)
        intervalId = setInterval(async () => {
          if (!captainLocation) return;
          const { latitude: lat, longitude: lng } = captainLocation;
          try {
            // HTTP: تخزين نقاط المسار الفعلي لحساب السعر الحقيقي (TASK-10)
            await onDemandService.updateLocation(rideId, [lng, lat]);
            // Socket: بث لغرفة المسار الثابت إن كانت الرحلة مرتبطة بمسار
            if (ride?.permanentRouteId) {
              socketService.emitRouteLocation({
                routeId:   ride.permanentRouteId,
                captainId: ride.captain?._id ?? '',
                lat, lng,
              });
            }
          } catch {}
        }, 6000);
      })();

      return () => {
        if (subscription) subscription.remove();
        if (intervalId)   clearInterval(intervalId);
      };
    }, [rideId, captainLocation, ride])
  );


  // ── Button press animation ────────────────────────────
  const animateBtn = (onEnd: () => void) => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0,  duration: 150, useNativeDriver: true }),
    ]).start(onEnd);
  };

  // ── Execute action ────────────────────────────────────
  const handleAction = () => {
    const cfg = ACTIONS[actionIndex];
    Alert.alert(cfg.label, cfg.confirmMsg, [
      { text: 'تراجع', style: 'cancel' },
      {
        text: 'نعم، تأكيد',
        onPress: () => animateBtn(() => executeAction(cfg.action)),
      }
    ]);
  };

  const executeAction = async (action: RideAction) => {
    setLoading(true);
    try {
      if (action === 'arrive')   await onDemandService.arrivedAtPickup(rideId);
      if (action === 'start')    await onDemandService.startRide(rideId);
      if (action === 'complete') {
        await onDemandService.completeRide(rideId);
        Alert.alert(
          'انتهت الرحلة 🎉',
          'تم إنهاء الرحلة بنجاح! شكراً على خدمتك.',
          [{
            text: 'عرض التفاصيل',
            onPress: () => navigation.replace('Payment', {
              rideId,
              captainId:   ride?.passenger?._id,
              captainName: ride?.passenger?.name,
              fare:        ride?.finalPrice ?? ride?.estimatedPrice,
            }),
          }]
        );
        return;
      }
      // الانتقال للمرحلة التالية
      if (actionIndex < ACTIONS.length - 1) {
        setActionIndex(prev => prev + 1);
      }
    } catch (err: any) {
      Alert.alert('خطأ', err?.response?.data?.message || 'تعذّرت العملية، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  // ── Pickup & Dropoff ──────────────────────────────────
  const pickupCoord  = ride?.pickupLocation  ? { latitude: ride.pickupLocation.coordinates[1],  longitude: ride.pickupLocation.coordinates[0] }  : null;
  const dropoffCoord = ride?.dropoffLocation ? { latitude: ride.dropoffLocation.coordinates[1], longitude: ride.dropoffLocation.coordinates[0] } : null;
  const currentAction = ACTIONS[actionIndex];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── MAP ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={darkMapStyle}
        initialRegion={
          captainLocation
            ? { ...captainLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : pickupCoord
            ? { ...pickupCoord,     latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 31.9522, longitude: 35.9334, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {/* موقع الكابتن */}
        {captainLocation && (
          <Marker coordinate={captainLocation}>
            <View style={styles.captainPin}>
              <Ionicons name="car-sport" size={22} color="#FFF" />
            </View>
          </Marker>
        )}
        {/* نقطة الالتقاء */}
        {pickupCoord && actionIndex === 0 && (
          <Marker coordinate={pickupCoord}>
            <View style={styles.pickupPin}>
              <Ionicons name="person" size={16} color="#FFF" />
            </View>
          </Marker>
        )}
        {/* الوجهة */}
        {dropoffCoord && actionIndex > 0 && (
          <Marker coordinate={dropoffCoord}>
            <View style={styles.dropoffPin}>
              <Ionicons name="flag" size={16} color="#FFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top gradient */}
      <LinearGradient colors={['rgba(15,23,42,0.92)', 'transparent']} style={styles.topGrad} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          Alert.alert('تنبيه', 'الرحلة لا تزال نشطة. هل تريد العودة للرئيسية؟', [
            { text: 'تراجع', style: 'cancel' },
            { text: 'نعم', onPress: () => navigation.navigate('CaptainTabs') },
          ]);
        }}>
          <Ionicons name="chevron-forward" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>إدارة الرحلة الفورية</Text>
          <Text style={styles.headerSub}>{actionIndex + 1} من {ACTIONS.length} مراحل</Text>
        </View>

        {/* Radar pulse (On-the-way to pickup) */}
        {actionIndex === 0 && (
          <Animated.View style={[styles.radarDot, {
            transform: [{ scale: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.5] }) }],
            opacity:   radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
          }]} />
        )}
        <View style={styles.headerRight}>
          <Ionicons
            name={actionIndex === 0 ? 'navigate-circle' : actionIndex === 1 ? 'car-sport' : 'flag-sharp'}
            size={22}
            color={TEAL_LIGHT}
          />
        </View>
      </View>

      {/* ── Bottom Sheet ── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['rgba(15,23,42,0.98)', '#0B1120']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.sheetHighlight} />
        <View style={styles.handle} />

        {/* ── Progress Bar ── */}
        <View style={styles.progressRow}>
          {ACTIONS.map((act, idx) => (
            <View key={act.action} style={styles.progressStep}>
              <View style={[
                styles.progressCircle,
                idx < actionIndex  && { backgroundColor: GREEN, borderColor: GREEN },
                idx === actionIndex && { borderColor: currentAction.color, backgroundColor: currentAction.color + '20' },
              ]}>
                <Ionicons
                  name={idx < actionIndex ? 'checkmark' : act.icon as any}
                  size={13}
                  color={idx < actionIndex ? '#FFF' : idx === actionIndex ? currentAction.color : 'rgba(255,255,255,0.25)'}
                />
              </View>
              {idx < ACTIONS.length - 1 && (
                <View style={[styles.progressLine, idx < actionIndex && { backgroundColor: GREEN }]} />
              )}
            </View>
          ))}
        </View>

        {/* ── Passenger Card ── */}
        {ride?.passenger && (
          <View style={styles.passengerCard}>
            <LinearGradient colors={['#1E3A5F', '#0F172A']} style={styles.passengerAvatar}>
              <Text style={styles.passengerAvatarTxt}>
                {ride.passenger.name?.charAt(0)?.toUpperCase() || 'ر'}
              </Text>
            </LinearGradient>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerName}>{ride.passenger.name}</Text>
              {ride.passenger.phone && (
                <Text style={styles.passengerPhone}>{ride.passenger.phone}</Text>
              )}
            </View>
            <View style={styles.priceTag}>
              <Text style={styles.priceNum}>{ride.estimatedPrice?.toFixed(2)}</Text>
              <Text style={styles.priceCur}>د.أ</Text>
            </View>
          </View>
        )}

        {/* ── Route Display ── */}
        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <View style={styles.routeDotGreen} />
            <Text style={styles.routeTxt} numberOfLines={1}>
              {ride?.pickupLocation?.address || 'موقع الانطلاق'}
            </Text>
          </View>
          <View style={styles.routeVertLine} />
          <View style={styles.routeRow}>
            <View style={styles.routeDotOrange} />
            <Text style={styles.routeTxt} numberOfLines={1}>
              {ride?.dropoffLocation?.address || 'الوجهة'}
            </Text>
          </View>
        </View>

        {/* ── Main Action Button ── */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: currentAction.bgColor,
              borderColor: currentAction.color + '50',
            }]}
            onPress={handleAction}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={currentAction.color} size="small" />
            ) : (
              <>
                <Ionicons name={currentAction.icon as any} size={24} color={currentAction.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionLabel, { color: currentAction.color }]}>{currentAction.label}</Text>
                  <Text style={styles.actionSub}>{currentAction.sublabel}</Text>
                </View>
                <Ionicons name="chevron-back-circle" size={28} color={currentAction.color} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },

  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: 20, right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '700' },
  headerRight: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(13,148,136,0.15)',
    borderWidth: 1, borderColor: TEAL + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  radarDot: {
    position: 'absolute', right: 48, top: 10,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: TEAL_LIGHT,
  },

  // Map Pins
  captainPin: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 10,
  },
  pickupPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  dropoffPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },

  // Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    overflow: 'hidden',
    minHeight: height * 0.48,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sheetHighlight: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },

  // Progress
  progressRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    marginBottom: 18, paddingHorizontal: 4,
  },
  progressStep: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  progressCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  progressLine: {
    flex: 1, height: 2, marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Passenger card
  passengerCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  passengerAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  passengerAvatarTxt: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  passengerInfo: { flex: 1, alignItems: 'flex-end' },
  passengerName:  { fontSize: 16, fontWeight: '900', color: '#FFF', marginBottom: 2, textAlign: 'right' },
  passengerPhone: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '700' },
  priceTag: { alignItems: 'center', marginRight: 4 },
  priceNum: { fontSize: 20, fontWeight: '900', color: TEAL_LIGHT },
  priceCur: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },

  // Route
  routeBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 18,
  },
  routeRow:        { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  routeDotGreen:   { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, marginLeft: 4 },
  routeDotOrange:  { width: 12, height: 12, borderRadius: 6, backgroundColor: ORANGE, marginLeft: 4 },
  routeVertLine:   { width: 1.5, height: 16, backgroundColor: 'rgba(255,255,255,0.12)', marginRight: 9, marginVertical: 3 },
  routeTxt:        { flex: 1, fontSize: 14, fontWeight: '700', color: '#E2E8F0', textAlign: 'right' },

  // Action button
  actionBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 14,
    borderRadius: 22, padding: 18,
    borderWidth: 1.5,
  },
  actionLabel: { fontSize: 17, fontWeight: '900', textAlign: 'right', marginBottom: 3 },
  actionSub:   { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '700', textAlign: 'right' },
});

export default OnDemandManagementScreen;
