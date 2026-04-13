import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Platform, StatusBar, Dimensions, Linking, Easing,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import socketService from '../../services/socketService';
import { onDemandService } from '../../services/onDemandService';

const { height } = Dimensions.get('window');
const NAVY   = '#0F172A';
const ORANGE = '#F97316';
const GREEN  = '#10B981';
const BLUE   = '#3B82F6';

// ── RIDE PHASES ──────────────────────────────────────────
type RideStatus = 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';

const PHASES: { key: RideStatus; label: string; icon: string; color: string }[] = [
  { key: 'accepted',    label: 'الكابتن في الطريق',   icon: 'car-outline',       color: ORANGE },
  { key: 'arrived',     label: 'الكابتن وصل ✓',       icon: 'checkmark-circle',  color: GREEN },
  { key: 'in_progress', label: 'في الطريق إليك 🚗',   icon: 'navigate',          color: BLUE },
  { key: 'completed',   label: 'وصلت بأمان 🎉',        icon: 'flag-outline',      color: '#A855F7' },
];

const darkMapStyle = [
  { elementType: 'geometry',              stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#746855' }] },
  { featureType: 'road',   elementType: 'geometry',        stylers: [{ color: '#38414e' }] },
  { featureType: 'road',   elementType: 'geometry.stroke',  stylers: [{ color: '#212a37' }] },
  { featureType: 'road',   elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water',  elementType: 'geometry',        stylers: [{ color: '#17263c' }] },
  { featureType: 'poi.park', elementType: 'geometry',      stylers: [{ color: '#263c3f' }] },
];

const OnDemandTrackingScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { rideId, initialRide } = route.params as {
    rideId: string;
    initialRide: any;
  };

  const [ride, setRide]               = useState<any>(initialRide || null);
  const [status, setStatus]           = useState<RideStatus>(initialRide?.status || 'accepted');
  const [captainCoords, setCaptainCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const mapRef    = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  // ── Animate sheet in on mount ─────────────────────────
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, []);

  // ── Pulse animation for captain pin ───────────────────
  useEffect(() => {
    if (status === 'accepted') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true, easing: Easing.ease }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [status]);

  // ── Socket listeners ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      socketService.joinRideRoom(rideId);

      // موقع الكابتن اللحظي
      socketService.on('captain_location_update', (loc: any) => {
        const coords = {
          latitude:  loc.coordinates[1],
          longitude: loc.coordinates[0],
        };
        setCaptainCoords(coords);
        mapRef.current?.animateToRegion(
          { ...coords, latitudeDelta: 0.015, longitudeDelta: 0.015 },
          800
        );
      });

      // مراحل الرحلة
      socketService.on('captain_arrived', () => setStatus('arrived'));
      socketService.on('ride_started',    () => setStatus('in_progress'));

      socketService.on('ride_completed',  (data: any) => {
        setStatus('completed');
        setTimeout(() => {
          navigation.replace('Payment', {
            rideId,
            captainId:   ride?.captain?._id,
            captainName: ride?.captain?.name,
            fare:        data?.finalPrice ?? ride?.estimatedPrice,
          });
        }, 2000);
      });

      socketService.on('ride_cancelled', (data: any) => {
        setStatus('cancelled');
        Alert.alert(
          'تم إلغاء الرحلة ⚠️',
          data?.reason || 'تم إلغاء الرحلة',
          [{ text: 'حسناً', onPress: () => navigation.goBack() }]
        );
      });

      // Timeout event from backend
      socketService.on('ride_timeout', (data: any) => {
        Alert.alert('انتهت مدة البحث', data?.message || 'لم يتوفر كابتن');
        navigation.goBack();
      });

      return () => {
        socketService.off('captain_location_update');
        socketService.off('captain_arrived');
        socketService.off('ride_started');
        socketService.off('ride_completed');
        socketService.off('ride_cancelled');
        socketService.off('ride_timeout');
      };
    }, [rideId])
  );

  // ── Load ride if not passed ───────────────────────────
  useEffect(() => {
    if (!ride) {
      onDemandService.getRide(rideId)
        .then(r => setRide(r.data.data))
        .catch(() => {});
    }
  }, []);

  // ── Cancel ride ───────────────────────────────────────
  const handleCancel = () => {
    if (status !== 'accepted') {
      Alert.alert('تنبيه', 'لا يمكن إلغاء الرحلة بعد وصول الكابتن');
      return;
    }
    Alert.alert('إلغاء الرحلة', 'هل أنت متأكد من إلغاء الرحلة؟', [
      { text: 'تراجع',  style: 'cancel' },
      {
        text: 'نعم، ألغِ',  style: 'destructive',
        onPress: async () => {
          try {
            await onDemandService.cancelRide(rideId, 'الراكب ألغى الرحلة');
          } catch {}
          navigation.goBack();
        }
      }
    ]);
  };

  // ── Current phase index ───────────────────────────────
  const phaseIndex = PHASES.findIndex(p => p.key === status);
  const currentPhase = PHASES[Math.max(0, phaseIndex)];

  // Pickup & dropoff coords
  const pickupCoord  = ride?.pickupLocation  ? { latitude: ride.pickupLocation.coordinates[1],  longitude: ride.pickupLocation.coordinates[0] }  : null;
  const dropoffCoord = ride?.dropoffLocation ? { latitude: ride.dropoffLocation.coordinates[1], longitude: ride.dropoffLocation.coordinates[0] } : null;

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
          captainCoords
            ? { ...captainCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : pickupCoord
            ? { ...pickupCoord,  latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 31.9522, longitude: 35.9334, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
        showsUserLocation
        showsMyLocationButton={false}
        pitchEnabled={false}
      >
        {/* Captain marker */}
        {captainCoords && (
          <Marker coordinate={captainCoords}>
            <Animated.View style={[styles.captainPin, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="car-sport" size={20} color="#FFF" />
            </Animated.View>
          </Marker>
        )}

        {/* Pickup */}
        {pickupCoord && status === 'accepted' && (
          <Marker coordinate={pickupCoord}>
            <View style={styles.pinGreen}>
              <Ionicons name="person" size={14} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Dropoff */}
        {dropoffCoord && (
          <Marker coordinate={dropoffCoord}>
            <View style={styles.pinOrange}>
              <Ionicons name="flag" size={14} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Route line placeholder */}
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor={ORANGE} strokeWidth={3} />
        )}
      </MapView>

      {/* Top gradient */}
      <LinearGradient colors={['rgba(15,23,42,0.9)', 'transparent']} style={styles.topGrad} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={[styles.statusPill, { backgroundColor: currentPhase.color + '25', borderColor: currentPhase.color + '60' }]}>
          <Ionicons name={currentPhase.icon as any} size={14} color={currentPhase.color} />
          <Text style={[styles.statusPillTxt, { color: currentPhase.color }]}>{currentPhase.label}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Progress Steps ── */}
      <View style={styles.stepsRow}>
        {PHASES.map((phase, idx) => {
          const done    = idx < phaseIndex;
          const active  = idx === phaseIndex;
          return (
            <View key={phase.key} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                done   && { backgroundColor: GREEN, borderColor: GREEN },
                active && { borderColor: phase.color, backgroundColor: phase.color + '20' },
              ]}>
                <Ionicons
                  name={done ? 'checkmark' : (phase.icon as any)}
                  size={12}
                  color={done ? '#FFF' : active ? phase.color : 'rgba(255,255,255,0.25)'}
                />
              </View>
              {idx < PHASES.length - 1 && (
                <View style={[styles.stepLine, done && { backgroundColor: GREEN }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* ── Bottom Sheet ── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={['rgba(18,24,48,0.98)', 'rgba(15,23,42,1)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.sheetHighlight} />
        <View style={styles.handle} />

        {/* ── Captain Card ── */}
        {ride?.captain && (
          <View style={styles.captainCard}>
            {/* Avatar */}
            <LinearGradient colors={['#0D9488', '#065F46']} style={styles.avatar}>
              <Text style={styles.avatarTxt}>{ride.captain.name?.charAt(0)?.toUpperCase() || 'ك'}</Text>
            </LinearGradient>

            {/* Info */}
            <View style={styles.captainInfo}>
              <Text style={styles.captainName}>{ride.captain.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingTxt}>
                  {Number((ride.captain.rating as any)?.average ?? ride.captain.rating ?? 0).toFixed(1)}
                </Text>
              </View>
              {ride.captain.vehicle && (
                <Text style={styles.vehicleTxt} numberOfLines={1}>
                  {ride.captain.vehicle.model} · {ride.captain.vehicle.color} · {ride.captain.vehicle.plateNumber}
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: GREEN + '40' }]}
                onPress={() => Linking.openURL(`tel:${ride.captain.phone}`)}
              >
                <Ionicons name="call" size={20} color={GREEN} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: BLUE + '40' }]}
                onPress={() => navigation.navigate('Chat', { userId: ride.captain._id, userName: ride.captain.name })}
              >
                <Ionicons name="chatbubbles" size={20} color={BLUE} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Route Info ── */}
        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={16} color={GREEN} />
            <Text style={styles.routeTxt} numberOfLines={1}>
              {ride?.pickupLocation?.address || 'موقع الانطلاق'}
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Ionicons name="flag" size={16} color={ORANGE} />
            <Text style={styles.routeTxt} numberOfLines={1}>
              {ride?.dropoffLocation?.address || 'الوجهة'}
            </Text>
          </View>
        </View>

        {/* ── Price & ETA ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="cash-outline" size={18} color={ORANGE} />
            <Text style={styles.infoVal}>{ride?.estimatedPrice?.toFixed(2) || '—'} <Text style={styles.infoCur}>د.أ</Text></Text>
            <Text style={styles.infoLabel}>التكلفة المتوقعة</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={18} color={BLUE} />
            <Text style={styles.infoVal}>{ride?.estimatedDuration || '—'} <Text style={styles.infoCur}>دقيقة</Text></Text>
            <Text style={styles.infoLabel}>الوقت المتوقع</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="git-merge-outline" size={18} color={GREEN} />
            <Text style={styles.infoVal}>{ride?.estimatedDistance?.toFixed(1) || '—'} <Text style={styles.infoCur}>كم</Text></Text>
            <Text style={styles.infoLabel}>المسافة</Text>
          </View>
        </View>

        {/* ── Cancel Button (قبل وصول الكابتن فقط) ── */}
        {status === 'accepted' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.cancelTxt}>إلغاء الرحلة</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },

  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: 20, right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  statusPillTxt: { fontSize: 12, fontWeight: '800' },

  // Progress Steps
  stepsRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 104,
    left: 20, right: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepItem: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },

  // Captain marker on map
  captainPin: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 10,
  },
  pinGreen: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  pinOrange: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },

  // Bottom Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    overflow: 'hidden',
    minHeight: height * 0.42,
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

  // Captain Card
  captainCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  avatarTxt:  { fontSize: 22, fontWeight: '900', color: '#FFF' },
  captainInfo: { flex: 1, alignItems: 'flex-end' },
  captainName: { fontSize: 16, fontWeight: '900', color: '#FFF', marginBottom: 3, textAlign: 'right' },
  ratingRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 3 },
  ratingTxt:  { fontSize: 12, color: '#F59E0B', fontWeight: '800' },
  vehicleTxt: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textAlign: 'right' },
  actionBtns: { flexDirection: 'column', gap: 8, marginRight: 4 },
  actionBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  // Route box
  routeBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 14,
  },
  routeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  routeDivider: { height: 14, width: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 7, marginVertical: 4 },
  routeTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: '#E2E8F0', textAlign: 'right' },

  // Info cards row
  infoRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
  infoCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    gap: 4,
  },
  infoVal:   { fontSize: 16, fontWeight: '900', color: '#FFF' },
  infoCur:   { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  infoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },

  // Cancel
  cancelBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  cancelTxt: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
});

export default OnDemandTrackingScreen;
