import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
  ActivityIndicator, Dimensions, Animated, Platform, StatusBar,
  FlatList, Keyboard, KeyboardAvoidingView, ScrollView, Linking
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '../../constants/theme';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { onDemandService } from '../../services/onDemandService';
import socketService from '../../services/socketService';
import { OnDemandRide, NearbyCapt } from '../../types';

const { height, width } = Dimensions.get('window');
const NAVY         = '#0F172A';
const BLUE_ACCENT  = '#3B82F6';
const ORANGE       = '#F97316';

// ── Same high-quality dark map style as PassengerHomeScreen ──────
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

// ── Nominatim place suggestion type ──────────────────────────────
interface PlaceSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const OnDemandRideScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { location, requestPermission } = useLocation();
  const { user } = useAuth();

  // ── Ride state ────────────────────────────────────────────────
  const [step, setStep] = useState<'idle' | 'selecting' | 'searching' | 'accepted' | 'arriving' | 'in_ride'>('idle');
  const [nearbyCaptains, setNearbyCaptains] = useState<NearbyCapt[]>([]);
  const [ride, setRide] = useState<OnDemandRide | null>(null);
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'wallet'>('cash');

  // ── Destination / Autocomplete ────────────────────────────────
  const [activeInput, setActiveInput] = useState<'start' | 'dest' | null>(null);
  const [startText, setStartText] = useState('موقعي الحالي');
  const [selectedStart, setSelectedStart] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const [destText, setDestText] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDest, setSelectedDest] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // ── Calculation ───────────────────────────────────────────────
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // ── Animation ─────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Socket & nearby & Routing ────────────────────────────────
  useEffect(() => {
    if (location) {
      loadNearby();
      if (!selectedStart) {
        setSelectedStart({ address: 'موقعي الحالي', latitude: location.latitude, longitude: location.longitude });
      }
    }
    connectSocket();
    return () => {
      socketService.off('ride_accepted');
      socketService.off('captain_arrived');
      socketService.off('ride_started');
      socketService.off('ride_completed');
    };
  }, [location]);

  useEffect(() => {
    if (selectedStart && selectedDest) {
      setCalcLoading(true);
      fetch(`https://router.project-osrm.org/route/v1/driving/${selectedStart.longitude},${selectedStart.latitude};${selectedDest.longitude},${selectedDest.latitude}?overview=false`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const distKm = data.routes[0].distance / 1000;
            const durMin = Math.round(data.routes[0].duration / 60);
            setDistance(distKm.toFixed(1));
            setDuration(durMin.toString());
            let p = distKm * 0.10;
            if (p > 11.0) p = 11.0;
            if (p < 1.0) p = 1.0; // Minimum 1 JOD
            setPrice(p.toFixed(2));
          }
          setCalcLoading(false);
        }).catch(() => setCalcLoading(false));
    } else {
      setDistance(null);
      setDuration(null);
      setPrice(null);
    }
  }, [selectedStart, selectedDest]);

  const loadNearby = async () => {
    if (!location) { await requestPermission(); return; }
    try {
      const res = await onDemandService.getNearbyCaptains(location.latitude, location.longitude);
      setNearbyCaptains(res.data.data);
    } catch {}
  };

  const connectSocket = () => {
    socketService.on('ride_accepted', (data: any) => {
      // TASK-02: الانتقال لشاشة التتبع المباشر بعد قبول الكابتن
      const rideWithCaptain = { ...ride, ...data, status: 'accepted' };
      navigation.navigate('OnDemandTracking', {
        rideId:     data._id ?? ride?._id,
        initialRide: rideWithCaptain,
      });
    });
    socketService.on('captain_arrived', () => setStep('arriving'));
    socketService.on('ride_started',    () => setStep('in_ride'));
    socketService.on('ride_completed',  () => {
      Alert.alert('الحمد لله على السلامة 🎉', 'لقد وصلت لوجهتك بأمان!', [
        { text: 'مواصلة الدفع', onPress: () => navigation.replace('Payment', {
          rideId: ride?._id, captainId: ride?.captain?._id,
          captainName: ride?.captain?.name, fare: ride?.finalPrice ?? ride?.estimatedPrice,
        })},
      ]);
      setStep('idle'); setRide(null);
    });
  };

  const startPulse = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
    ])).start();
  };

  // ── Nominatim Autocomplete (OpenStreetMap — free, no key) ─────
  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSuggestionsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=6&accept-language=ar`,
        { headers: { 'User-Agent': 'KhodniMaakApp/1.0' } }
      );
      const data: PlaceSuggestion[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    }
    setSuggestionsLoading(false);
  }, []);

  const onTextChange = (text: string, type: 'start' | 'dest') => {
    if (type === 'start') {
      setStartText(text);
      setSelectedStart(null);
    } else {
      setDestText(text);
      setSelectedDest(null);
    }
    setShowSuggestions(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const onSelectSuggestion = (place: PlaceSuggestion) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    // Build compact display name
    const parts = [
      place.address.road || place.address.suburb,
      place.address.city || place.address.state,
    ].filter(Boolean);
    const label = parts.join('، ') || place.display_name.split(',').slice(0, 2).join(',');

    if (activeInput === 'start') {
      setStartText(label);
      setSelectedStart({ address: label, latitude: lat, longitude: lon });
    } else {
      setDestText(label);
      setSelectedDest({ address: label, latitude: lat, longitude: lon });
    }

    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();

    // Animate map to destination
    mapRef.current?.animateToRegion({
      latitude: lat, longitude: lon,
      latitudeDelta: 0.03, longitudeDelta: 0.03,
    }, 1000);
  };

  // ── Request Ride ──────────────────────────────────────────────
  const handleRequestRide = async () => {
    if (!location) return Alert.alert('تنبيه', 'يرجى تفعيل خدمة الموقع');
    if (!selectedStart) return Alert.alert('تنبيه', 'يرجى تحديد موقع الانطلاق');
    if (!selectedDest) return Alert.alert('تنبيه', 'يرجى تحديد وجهة الوصول');

    setLoading(true);
    try {
      const res = await onDemandService.requestRide({
        pickupLocation:  { type: 'Point', coordinates: [selectedStart.longitude, selectedStart.latitude], address: selectedStart.address },
        dropoffLocation: { type: 'Point', coordinates: [selectedDest.longitude, selectedDest.latitude], address: selectedDest.address },
        paymentMethod: payMethod,
      });
      const rideData = res.data.data;
      setRide(rideData);
      setStep('searching');
      startPulse();
      // Join socket room to listen for captain acceptance
      try { socketService.joinRideRoom(rideData._id); } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';
      Alert.alert('تعذّر الطلب', msg);
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!ride) { setStep('idle'); return; }
    try { await onDemandService.cancelRide(ride._id, 'لا أرغب بالانتظار'); } catch {}
    setStep('idle'); setRide(null);
  };

  const recenter = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude, longitude: location.longitude,
        latitudeDelta: 0.04, longitudeDelta: 0.04,
      }, 1000);
    }
  };

  if (!location) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={ORANGE} />
      <Text style={styles.loadingTxt}>جاري تحديد موقعك...</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── MAP (same config as PassengerHomeScreen) ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude:      location.latitude,
          longitude:     location.longitude,
          latitudeDelta:  0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={true}          // real blue dot
        showsMyLocationButton={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {/* Nearby idle captains */}
        {step === 'idle' && nearbyCaptains.map(c => (
          <Marker key={c._id} coordinate={{ latitude: c.location.latitude, longitude: c.location.longitude }}>
            <View style={styles.captPinIdle}>
              <Ionicons name="car-sport" size={15} color="#FFF" />
            </View>
          </Marker>
        ))}

        {/* Searching pulse ring marker */}
        {step === 'searching' && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          </Marker>
        )}

        {/* Active captain location */}
        {ride?.captainLocation && step !== 'idle' && (
          <Marker coordinate={{ latitude: ride.captainLocation.coordinates[1], longitude: ride.captainLocation.coordinates[0] }}>
            <View style={styles.captPinActive}>
              <Ionicons name="car-sport" size={20} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Destination pin */}
        {selectedDest && (
          <Marker coordinate={{ latitude: selectedDest.latitude, longitude: selectedDest.longitude }}>
            <View style={styles.destPin}>
              <Ionicons name="flag" size={16} color="#FFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top gradient */}
      <LinearGradient colors={['rgba(15,23,42,0.92)', 'transparent']} style={styles.topGrad} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTxt}>اطلب رحلتك الفورية</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={recenter}>
          <Ionicons name="locate" size={20} color={ORANGE} />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Sheet ── */}
      <KeyboardAvoidingView 
        style={styles.sheet} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient colors={['rgba(22,28,56,0.97)', 'rgba(15,23,42,1)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.glassHighlight} />
        {/* drag handle */}
        <View style={styles.handle} />

        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        >

        {/* IDLE — destination search */}
        {step === 'idle' && (
          <View>
            <Text style={styles.sheetTitle}>إلى أين تريد الذهاب؟</Text>

            {/* Start Location input */}
            <View style={[styles.inputWrap, activeInput === 'start' && styles.inputWrapOpen, { marginBottom: 8 }]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconWrap}>
                  <Ionicons name="location" size={18} color="#10B981" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="موقع الانطلاق..."
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={startText}
                  onChangeText={(t) => onTextChange(t, 'start')}
                  onFocus={() => setActiveInput('start')}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {startText.length > 0 && (
                  <TouchableOpacity onPress={() => { setStartText(''); setSelectedStart(null); setSuggestions([]); setShowSuggestions(false); }}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Destination input */}
            <View style={[styles.inputWrap, activeInput === 'dest' && styles.inputWrapOpen]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconWrap}>
                  {suggestionsLoading && activeInput === 'dest'
                    ? <ActivityIndicator size="small" color={ORANGE} />
                    : <Ionicons name="search" size={18} color={selectedDest ? ORANGE : 'rgba(255,255,255,0.4)'} />
                  }
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="ابحث عن موقع أو منطقة..."
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={destText}
                  onChangeText={(t) => onTextChange(t, 'dest')}
                  onFocus={() => setActiveInput('dest')}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {destText.length > 0 && (
                  <TouchableOpacity onPress={() => { setDestText(''); setSelectedDest(null); setSuggestions([]); setShowSuggestions(false); }}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsWrap}>
                  {suggestions.map((place, idx) => {
                    const label = [
                      place.address.road || place.address.suburb,
                      place.address.city || place.address.state,
                    ].filter(Boolean).join('، ') || place.display_name.split(',')[0];

                    return (
                      <TouchableOpacity
                        key={place.place_id}
                        style={[styles.suggestionItem, idx < suggestions.length - 1 && styles.suggestionBorder]}
                        onPress={() => onSelectSuggestion(place)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="location" size={16} color={ORANGE} style={{ marginLeft: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionMain} numberOfLines={1}>{label}</Text>
                          <Text style={styles.suggestionSub} numberOfLines={1}>
                            {place.display_name.split(',').slice(1, 3).join(',')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Remove the !showSuggestions strict requirement so if they selected both they see the info */}
            {(!showSuggestions || (selectedStart && selectedDest)) && (
              <>
                <Text style={styles.quickTitle}>وجهات شائعة</Text>
                <View style={styles.quickRow}>
                  {[
                    { label: 'وسط البلد', icon: 'business-outline' as const, lat: 31.9530, lon: 35.9106 },
                    { label: 'الجامعة الأردنية', icon: 'school-outline' as const, lat: 32.0135, lon: 35.8718 },
                    { label: 'المطار', icon: 'airplane-outline' as const, lat: 31.7225, lon: 35.9932 },
                    { label: 'سيتي مول', icon: 'cart-outline' as const, lat: 31.9822, lon: 35.8360 },
                  ].map(q => (
                    <TouchableOpacity
                      key={q.label}
                      style={styles.quickChip}
                      onPress={() => {
                        setDestText(q.label);
                        setSelectedDest({ address: q.label, latitude: q.lat, longitude: q.lon });
                        setShowSuggestions(false);
                        Keyboard.dismiss();
                        mapRef.current?.animateToRegion({
                          latitude: q.lat, longitude: q.lon,
                          latitudeDelta: 0.03, longitudeDelta: 0.03,
                        }, 1000);
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={q.icon} size={15} color={BLUE_ACCENT} />
                      <Text style={styles.quickChipTxt}>{q.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Dynamic Summary */}
                {distance && price && (
                  <View style={styles.summaryBox}>
                    <View style={styles.summaryItem}>
                      <Ionicons name="time-outline" size={20} color={ORANGE} />
                      <Text style={styles.summaryTxt}>{duration} دقيقة</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Ionicons name="git-merge-outline" size={20} color={BLUE_ACCENT} />
                      <Text style={styles.summaryTxt}>{distance} كم</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Ionicons name="cash-outline" size={20} color="#10B981" />
                      <Text style={styles.summaryTxt}>{price} د.أ</Text>
                    </View>
                  </View>
                )}

                {/* Captains count */}
                <View style={styles.infoRow}>
                  <Ionicons name="car-sport" size={18} color={ORANGE} />
                  <Text style={styles.infoTxt}>
                    {nearbyCaptains.length > 0
                      ? `${nearbyCaptains.length} كابتن متاح بالقرب منك ⚡`
                      : 'جاري البحث عن كباتن قريبين...'}
                  </Text>
                </View>

                {/* Payment toggle */}
                <View style={styles.payRow}>
                  <TouchableOpacity
                    style={[styles.payBtn, payMethod === 'cash' && styles.payBtnActive]}
                    onPress={() => setPayMethod('cash')}
                  >
                    <Ionicons name="cash-outline" size={16} color={payMethod === 'cash' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                    <Text style={[styles.payBtnTxt, payMethod === 'cash' && { color: '#FFF' }]}>نقدي</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.payBtn, payMethod === 'wallet' && styles.payBtnActive]}
                    onPress={() => setPayMethod('wallet')}
                  >
                    <Ionicons name="wallet-outline" size={16} color={payMethod === 'wallet' ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                    <Text style={[styles.payBtnTxt, payMethod === 'wallet' && { color: '#FFF' }]}>محفظة</Text>
                  </TouchableOpacity>
                </View>

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.mainBtn, (!selectedDest || !selectedStart || loading || calcLoading) && { opacity: 0.5 }]}
                  onPress={handleRequestRide}
                  disabled={!selectedDest || !selectedStart || loading || calcLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flash" size={20} color="#FFF" />
                  <Text style={styles.mainBtnTxt}>{calcLoading ? 'جاري حساب التكلفة...' : 'اطلب كابتن الآن'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* SEARCHING */}
        {step === 'searching' && (
          <View style={styles.centerCol}>
            <View style={styles.radarWrap}>
              <ActivityIndicator size="large" color={ORANGE} />
            </View>
            <Text style={styles.sheetTitle}>جاري البحث عن كابتن...</Text>
            <Text style={styles.subTxt}>نرسل طلبك للكباتن القريبين منك</Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Ionicons name="close" size={16} color="#EF4444" />
              <Text style={styles.cancelBtnTxt}>إلغاء الطلب</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACCEPTED / ARRIVING / IN RIDE */}
        {(step === 'accepted' || step === 'arriving' || step === 'in_ride') && ride?.captain && (
          <View>
            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusBadge, {
                backgroundColor: step === 'in_ride' ? 'rgba(59,130,246,0.15)' : step === 'arriving' ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)',
              }]}>
                <Ionicons
                  name={step === 'in_ride' ? 'navigate' : step === 'arriving' ? 'checkmark-circle' : 'timer-outline'}
                  size={14}
                  color={step === 'in_ride' ? BLUE_ACCENT : step === 'arriving' ? '#10B981' : ORANGE}
                />
                <Text style={[styles.statusBadgeTxt, {
                  color: step === 'in_ride' ? BLUE_ACCENT : step === 'arriving' ? '#10B981' : ORANGE,
                }]}>
                  {step === 'accepted' ? 'الكابتن في طريقه إليك' : step === 'arriving' ? 'الكابتن وصل!\u00A0✓' : 'أنت في الطريق 🚗'}
                </Text>
              </View>
            </View>

            {/* Captain Card */}
            <View style={styles.captainCard}>
              <View style={styles.captTop}>
                <View style={styles.captAvatar}>
                  <Text style={styles.captAvatarTxt}>{ride.captain.name?.charAt(0) || 'ك'}</Text>
                </View>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.captName}>{ride.captain.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.ratingTxt}>
                      {Number((ride.captain.rating as any)?.average ?? ride.captain.rating ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                  <TouchableOpacity style={styles.chatBtn}
                    onPress={() => Linking.openURL(`tel:${ride.captain?.phone}`)}>
                    <Ionicons name="call-outline" size={22} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.chatBtn}
                    onPress={() => navigation.navigate('Chat', { userId: ride.captain?._id, userName: ride.captain?.name })}>
                    <Ionicons name="chatbubbles-outline" size={22} color={ORANGE} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.vehicleRow}>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.vehicleModel}>{ride.captain.vehicle?.model || 'مركبة'}</Text>
                  <Text style={styles.vehicleColor}>{ride.captain.vehicle?.color}</Text>
                </View>
                <View style={styles.plateWrap}>
                  <Text style={styles.plateTxt}>{ride.captain.vehicle?.plateNumber}</Text>
                </View>
              </View>
            </View>

            {/* Destination row */}
            {selectedDest && (
              <View style={styles.destInfoRow}>
                <Ionicons name="flag" size={14} color={ORANGE} />
                <Text style={styles.destInfoTxt} numberOfLines={1}>{selectedDest.address}</Text>
              </View>
            )}

            {step === 'accepted' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={styles.cancelBtnTxt}>إلغاء الرحلة</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  loadingWrap: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { color: 'rgba(255,255,255,0.55)', fontWeight: '700', fontSize: 13 },

  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },

  // Header
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 56 : 42,
    left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTxt: { fontSize: 16, fontWeight: '900', color: '#FFF' },

  // Captain markers
  captPinIdle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(100,116,139,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFF',
  },
  captPinActive: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    ...SHADOWS.medium,
  },
  destPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
    ...SHADOWS.medium,
  },
  pulseRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.5)',
    position: 'absolute', top: -35, left: -35,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 44 : 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    height: Platform.OS === 'ios' ? height * 0.6 : height * 0.65,
    maxHeight: height * 0.8,
  },
  glassHighlight: {
    position: 'absolute', top: 0, left: '18%', right: '18%',
    height: 1, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 14 },

  // Destination input
  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  inputWrapOpen: {
    borderColor: ORANGE,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputIconWrap: { width: 26, alignItems: 'center' },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Suggestions
  suggestionsWrap: {
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderRadius: 18,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: ORANGE,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  suggestionMain: { fontSize: 14, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  suggestionSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'right', marginTop: 2 },

  // Quick picks
  quickTitle: {
    fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.5)',
    textAlign: 'right', marginBottom: 10,
  },
  quickRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  quickChipTxt: { color: BLUE_ACCENT, fontSize: 12, fontWeight: '800' },

  // Dynamic Summary Box
  summaryBox: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  summaryTxt: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },

  // Info & Pay
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    alignSelf: 'flex-end',
  },
  infoTxt: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '700' },

  payRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
  payBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  payBtnActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  payBtnTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800' },

  mainBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ORANGE,
    height: 56,
    borderRadius: 20,
    ...SHADOWS.medium,
    shadowColor: ORANGE,
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  mainBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' },

  // Searching
  centerCol: { alignItems: 'center', paddingVertical: 16 },
  radarWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
  },
  subTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 4 },

  cancelBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginTop: 16,
  },
  cancelBtnTxt: { color: '#EF4444', fontSize: 13, fontWeight: '800' },

  // Captain card (accepted state)
  statusBadgeRow: { marginBottom: 12 },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeTxt: { fontSize: 13, fontWeight: '800' },

  captainCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  captTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 14,
    marginBottom: 14,
  },
  captAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderWidth: 1.5, borderColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
  },
  captAvatarTxt: { fontSize: 20, fontWeight: '900', color: ORANGE },
  captName: { fontSize: 15, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingTxt: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  chatBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  vehicleModel: { fontSize: 14, color: '#FFF', fontWeight: '800', textAlign: 'right' },
  vehicleColor: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 2 },
  plateWrap: { backgroundColor: '#FCD34D', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  plateTxt: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  destInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  destInfoTxt: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

export default OnDemandRideScreen;
