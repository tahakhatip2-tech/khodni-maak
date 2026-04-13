import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, KeyboardAvoidingView, Platform, StatusBar, Dimensions, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { tripService } from '../../services/tripService';
import { useLocation } from '../../context/LocationContext';

const { width } = Dimensions.get('window');

// ── Teal Brand ──────────────────────────────────
const TEAL_DARK  = '#0D9488';
const TEAL_LIGHT = '#00D4AA';

const TRIP_TYPES = [
  { id: 'to_work',    icon: 'business', label: 'ذهاب للعمل',       desc: 'رحلة صباحية إلى وجهة عملك اليومية' },
  { id: 'from_work',  icon: 'home', label: 'إياب من العمل',    desc: 'رحلة مسائية للعودة إلى المنزل' },
  { id: 'round-trip', icon: 'sync', label: 'ذهاب وإياب',       desc: 'مسار كامل يشمل الذهاب والعودة' },
  { id: 'one-way',    icon: 'arrow-forward', label: 'رحلة لمرة واحدة', desc: 'مسار فردي غير متكرر لأي وجهة' },
];

const DAYS = [
  { id: 'sunday',    label: 'أحد' },
  { id: 'monday',    label: 'اثنين' },
  { id: 'tuesday',   label: 'ثلاثاء' },
  { id: 'wednesday', label: 'أربعاء' },
  { id: 'thursday',  label: 'خميس' },
  { id: 'friday',    label: 'جمعة' },
  { id: 'saturday',  label: 'سبت' },
];

const STEPS = ['النوع', 'المسار', 'الوقت', 'التفضيلات', 'المراجعة'];
const PRICE_PER_KM = 0.007;

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const AMMAN_LOCATIONS = [
  { name: 'الجامعة الأردنية, عمان', lat: 32.0135, lng: 35.8718 },
  { name: 'مكة مول, شارع مكة', lat: 31.9793, lng: 35.8456 },
  { name: 'الدوار السابع, عمان', lat: 31.9566, lng: 35.8580 },
  { name: 'مستشفى الملك عبدالله المؤسس, إربد', lat: 32.4975, lng: 35.9868 },
  { name: 'المدينة الطبية, عمان', lat: 31.9833, lng: 35.8365 },
  { name: 'مجمع عمان الجديد, إربد', lat: 32.5312, lng: 35.8672 },
  { name: 'مطار الملكة علياء الدولي', lat: 31.7225, lng: 35.9932 },
  { name: 'البوليفارد العبدلي, عمان', lat: 31.9634, lng: 35.9080 },
  { name: 'جامعة اليرموك, إربد', lat: 32.5404, lng: 35.8530 },
  { name: 'الزرقاء الجديدة, الزرقاء', lat: 32.0805, lng: 36.1082 },
  { name: 'تاج مول, عبدون', lat: 31.9421, lng: 35.8887 },
];

const CreateTripScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { location } = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [tripType, setTripType] = useState('to_work');

  // Step 2
  const [startAddr, setStartAddr] = useState('');
  const [endAddr, setEndAddr] = useState('');
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [endCoords, setEndCoords] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState('15');
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
  const [routeLine, setRouteLine] = useState<{latitude: number, longitude: number}[]>([]);
  const [mapPickMode, setMapPickMode] = useState<'start' | 'end' | null>(null);

  // Function to calculate approx distance if OSRM fails
  const calcHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c * 1.3).toFixed(1);
  };

  useEffect(() => {
    if (startCoords && endCoords) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
                setRouteLine(coords);
                const distKm = (route.distance / 1000).toFixed(1);
                setDistance(distKm);
                calcPrice(distKm);
            }
        }).catch(err => {
            const dist = calcHaversine(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
            setDistance(dist);
            calcPrice(dist);
            setRouteLine([
              { latitude: startCoords.lat, longitude: startCoords.lng },
              { latitude: endCoords.lat, longitude: endCoords.lng }
            ]);
        });
    } else {
        setRouteLine([]);
    }
  }, [startCoords, endCoords]);

  // Suggestions logic
  const getSuggestions = () => {
    const query = activeInput === 'start' ? startAddr : endAddr;
    if (!query) return AMMAN_LOCATIONS.slice(0, 4);
    return AMMAN_LOCATIONS.filter(l => l.name.includes(query)).slice(0, 4);
  };

  // Step 3
  const [departureTime, setDepartureTime] = useState('07:30');
  const [returnTime, setReturnTime] = useState('17:00');
  const [recurring, setRecurring] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']);
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('1.50');

  // Step 4
  const [smoking, setSmoking] = useState(false);
  const [music, setMusic] = useState(true);
  const [pets, setPets] = useState(false);
  const [notes, setNotes] = useState('');

  const calcPrice = (km: string) => {
    let dist = parseFloat(km);
    if (isNaN(dist)) dist = 0;
    if (dist > 110) dist = 110;
    const p = dist * 0.10;
    setPrice(p.toFixed(2));
  };

  const toggleDay = (day: string) =>
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const validateStep = (): boolean => {
    if (step === 2) {
      if (!startAddr.trim()) { Alert.alert('تنبيه', 'يرجى إدخال نقطة الانطلاق.'); return false; }
      if (!endAddr.trim())   { Alert.alert('تنبيه', 'يرجى إدخال الوجهة.'); return false; }
    }
    if (step === 3) {
      if (!departureTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('تنبيه', 'وقت الانطلاق يجب أن يكون بصيغة مثال: 07:30'); return false; }
      if (tripType === 'round-trip' && !returnTime.match(/^\d{2}:\d{2}$/)) { Alert.alert('تنبيه', 'وقت العودة يجب أن يكون بصيغة مثال: 17:00'); return false; }
      if (recurring && selectedDays.length === 0) { Alert.alert('تنبيه', 'اختر يوماً واحداً على الأقل.'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!startAddr.trim()) { Alert.alert('تنبيه', 'يرجى تحديد نقطة الانطلاق أولاً.'); return; }
    if (!endAddr.trim())   { Alert.alert('تنبيه', 'يرجى تحديد الوجهة أولاً.'); return; }

    setLoading(true);
    try {
      const now = new Date();
      const [hh, mm] = departureTime.split(':').map(Number);
      const dept = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 7, mm || 30);
      // If departure time is in the past, move it to tomorrow
      if (dept <= now) dept.setDate(dept.getDate() + 1);
      const arrival = new Date(dept.getTime() + parseFloat(distance || '15') * 2 * 60000);

      let retDept: Date | undefined;
      if (tripType === 'round-trip') {
        const [rh, rm] = returnTime.split(':').map(Number);
        retDept = new Date(dept.getFullYear(), dept.getMonth(), dept.getDate(), rh || 17, rm || 0);
        if (retDept <= dept) retDept.setDate(retDept.getDate() + 1); // If return is next day?
      }

      // Use selected coordinates or fall back to GPS/Amman center
      const startLng = startCoords?.lng ?? (location?.longitude ?? 35.9106);
      const startLat = startCoords?.lat ?? (location?.latitude  ?? 31.9539);
      const endLng   = endCoords?.lng   ?? 35.9300;
      const endLat   = endCoords?.lat   ?? 31.9700;

      console.log('🚀 Creating trip with payload:', {
        tripType, startAddr, endAddr,
        startCoords: [startLng, startLat],
        endCoords: [endLng, endLat],
        departureTime: dept.toISOString(),
        seats, price,
      });

      const res = await tripService.createTrip({
        tripType,
        startLocation: {
          type: 'Point',
          coordinates: [startLng, startLat],
          address: startAddr,
        },
        endLocation: {
          type: 'Point',
          coordinates: [endLng, endLat],
          address: endAddr,
        },
        departureTime: dept.toISOString(),
        ...(retDept && { returnDepartureTime: retDept.toISOString() }),
        estimatedArrivalTime: arrival.toISOString(),
        availableSeats: seats,
        pricePerSeat: parseFloat(price) || 1,
        recurring: { enabled: recurring, days: recurring ? selectedDays : [] },
        preferences: { smokingAllowed: smoking, musicAllowed: music, petsAllowed: pets },
        notes: notes.trim() || undefined,
      });

      console.log('✅ Trip created:', res.data);

      Alert.alert('🎉 مبروك!', 'تم نشر رحلتك بنجاح وهي الآن ظاهرة للركاب.', [
        { text: 'عرض رحلاتي', onPress: () => navigation.navigate('MyTrips') },
        { text: 'رحلة أخرى',  onPress: () => { setStep(1); setStartAddr(''); setEndAddr(''); setStartCoords(null); setEndCoords(null); } },
      ]);
    } catch (err: any) {
      console.error('❌ Create trip error:', err?.response?.data || err?.message);
      Alert.alert('خطأ', err?.response?.data?.message || 'فشل في نشر الرحلة، يرجى المحاولة مجدداً.');
    }
    setLoading(false);
  };


  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Premium Ambient Background ── */}
      <ImageBackground
        source={require('../../../assets/images/welcome_bg_3d.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(15,23,42,0.9)', 'rgba(15,23,42,0.98)', '#0F172A']}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      {/* Teal Glow Effects */}
      <View style={styles.headerBg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      {/* ── STEP 2 Full-Screen Map Mode ── */}
      {step === 2 && (
        <View style={StyleSheet.absoluteFillObject}>
          {/* Full-Screen Map */}
          <MapView
            style={StyleSheet.absoluteFillObject}
            userInterfaceStyle="dark"
            showsUserLocation={true}
            onPress={(e) => {
              const coord = e.nativeEvent.coordinate;
              if (mapPickMode === 'start') {
                setStartCoords({ lat: coord.latitude, lng: coord.longitude });
                setStartAddr(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
                setMapPickMode(null);
              } else if (mapPickMode === 'end') {
                setEndCoords({ lat: coord.latitude, lng: coord.longitude });
                setEndAddr(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
                setMapPickMode(null);
              }
            }}
            region={{
              latitude: startCoords?.lat ?? location?.latitude ?? 31.9539,
              longitude: startCoords?.lng ?? location?.longitude ?? 35.9106,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            {startCoords && (
              <Marker
                draggable
                coordinate={{ latitude: startCoords.lat, longitude: startCoords.lng }}
                onDragEnd={(e) => {
                  const c = e.nativeEvent.coordinate;
                  setStartCoords({ lat: c.latitude, lng: c.longitude });
                  setStartAddr(`${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`);
                }}
              >
                <View style={{ backgroundColor: '#10B981', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' }}>
                  <Ionicons name="location" size={18} color="#FFF" />
                </View>
              </Marker>
            )}
            {endCoords && (
              <Marker
                draggable
                coordinate={{ latitude: endCoords.lat, longitude: endCoords.lng }}
                onDragEnd={(e) => {
                  const c = e.nativeEvent.coordinate;
                  setEndCoords({ lat: c.latitude, lng: c.longitude });
                  setEndAddr(`${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`);
                }}
              >
                <View style={{ backgroundColor: '#EF4444', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' }}>
                  <Ionicons name="flag" size={18} color="#FFF" />
                </View>
              </Marker>
            )}
            {routeLine.length > 0 && (
              <Polyline coordinates={routeLine} strokeColor={TEAL_LIGHT} strokeWidth={5} lineCap="round" />
            )}
          </MapView>

          {/* Top Bar back button */}
          <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 56 : 42, right: 16, zIndex: 100 }}>
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={{ backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 20, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Ionicons name="arrow-forward" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Pick Mode Hint Badge */}
          {mapPickMode && (
            <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 56 : 42, alignSelf: 'center', left: 60, right: 60, zIndex: 100 }}>
              <View style={{ backgroundColor: mapPickMode === 'start' ? '#10B981' : '#EF4444', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center', flexDirection: 'row-reverse', gap: 8, justifyContent: 'center' }}>
                <Ionicons name={mapPickMode === 'start' ? 'location' : 'flag'} size={18} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>
                  {mapPickMode === 'start' ? 'انقر لتحديد نقطة الانطلاق' : 'انقر لتحديد الوجهة'}
                </Text>
              </View>
            </View>
          )}

          {/* Bottom Sheet Controls */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.97)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 100, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 17, textAlign: 'right', marginBottom: 14 }}>تحديد مسار الرحلة</Text>

            {/* Start Point */}
            <TouchableOpacity
              onPress={() => setMapPickMode('start')}
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: mapPickMode === 'start' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: mapPickMode === 'start' ? '#10B981' : startCoords ? '#10B981' : 'rgba(255,255,255,0.15)', marginBottom: 10 }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="location" size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', textAlign: 'right' }}>نقطة الانطلاق</Text>
                <Text style={{ color: startCoords ? '#10B981' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: 2 }} numberOfLines={1}>
                  {startAddr || 'اضغط لتحديد على الخريطة'}
                </Text>
              </View>
              <Ionicons name={startCoords ? 'checkmark-circle' : 'radio-button-off'} size={22} color={startCoords ? '#10B981' : 'rgba(255,255,255,0.3)'} />
            </TouchableOpacity>

            {/* End Point */}
            <TouchableOpacity
              onPress={() => setMapPickMode('end')}
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: mapPickMode === 'end' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: mapPickMode === 'end' ? '#EF4444' : endCoords ? '#EF4444' : 'rgba(255,255,255,0.15)', marginBottom: 16 }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="flag" size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', textAlign: 'right' }}>الوجهة</Text>
                <Text style={{ color: endCoords ? '#EF4444' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: 2 }} numberOfLines={1}>
                  {endAddr || 'اضغط لتحديد على الخريطة'}
                </Text>
              </View>
              <Ionicons name={endCoords ? 'checkmark-circle' : 'radio-button-off'} size={22} color={endCoords ? '#EF4444' : 'rgba(255,255,255,0.3)'} />
            </TouchableOpacity>

            {/* Distance + Next */}
            {startCoords && endCoords && (
              <>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800' }}>المسافة: <Text style={{ color: TEAL_LIGHT }}>{distance} كم</Text></Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800' }}>السعر المقترح: <Text style={{ color: TEAL_LIGHT }}>{price} JOD</Text></Text>
                </View>
                <TouchableOpacity
                  onPress={() => setStep(3)}
                  style={{ backgroundColor: TEAL_DARK, borderRadius: 18, height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 10 }}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>التالي: تحديد التوقيت</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* ── Normal layout for all other steps ── */}
      {step !== 2 && (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── App Bar ── */}
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>إنشاء رحلة جديدة</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Step Progress Bar ── */}
        <View style={styles.progressWrap}>
          {/* Line */}
          <View style={styles.progressLineBg}>
            <View style={[styles.progressLineFill, { width: `${progressPct}%` as any }]} />
          </View>
          {/* Circles */}
          <View style={styles.stepsRow}>
            {STEPS.map((label, i) => {
              const num = i + 1;
              const done    = step > num;
              const active  = step === num;
              return (
                <View key={i} style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    done   && styles.stepDone,
                    active && styles.stepActive,
                    !done && !active && styles.stepPending,
                  ]}>
                    {done
                      ? <Ionicons name="checkmark" size={18} color="#FFF" />
                      : <Text style={[styles.stepNumTxt, active && { color: COLORS.white }]}>{num}</Text>
                    }
                  </View>
                  <Text style={[styles.stepLbl, active && styles.stepLblActive]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Content Scroll ── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* ══ STEP 1: Trip Type ══ */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>ما نوع رحلتك؟</Text>
                <Text style={styles.stepSub}>اختر طبيعة المسار ليظهر للركاب المناسبين.</Text>
                <View style={styles.typeList}>
                  {TRIP_TYPES.map(t => {
                    const sel = tripType === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.typeCard, sel && styles.typeCardSel]}
                        onPress={() => {
                          setTripType(t.id);
                          // Auto advance for better UX
                          setTimeout(() => setStep(2), 250);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.typeIcon, sel && styles.typeIconSel]}>
                          <Ionicons name={t.icon as any} size={24} color={sel ? '#FFF' : TEAL_DARK} />
                        </View>
                        <View style={styles.typeInfo}>
                          <Text style={[styles.typeName, sel && { color: COLORS.white }]}>{t.label}</Text>
                          <Text style={[styles.typeDesc, sel && { color: 'rgba(255,255,255,0.78)' }]}>{t.desc}</Text>
                        </View>
                        <View style={[styles.radioOuter, sel && styles.radioOuterSel]}>
                          {sel && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                <TouchableOpacity 
                    style={[styles.inlineAdvanceBtn, { marginTop: 20 }]} 
                    onPress={() => setStep(2)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                    <Text style={styles.inlineAdvanceTxt}>التالي: تحديد المسار</Text>
                  </TouchableOpacity>
              </View>
            )}

            {/* ══ STEP 2: Route ══ */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>حدد مسار الرحلة</Text>
                <Text style={styles.stepSub}>من أين تنطلق وإلى أين تتجه؟</Text>

                {/* --- Live Interactive Map --- */}
                <View style={styles.mapCard}>
                  <MapView
                    style={StyleSheet.absoluteFillObject}
                    userInterfaceStyle="dark"
                    showsUserLocation={true}
                    onPress={(e) => {
                      const coord = e.nativeEvent.coordinate;
                      if (activeInput === 'start') {
                        setStartCoords({ lat: coord.latitude, lng: coord.longitude });
                        setStartAddr('نقطة محددة على الخريطة');
                        setActiveInput(null);
                      } else if (activeInput === 'end') {
                        setEndCoords({ lat: coord.latitude, lng: coord.longitude });
                        setEndAddr('وجهة محددة على الخريطة');
                        setActiveInput(null);
                      }
                    }}
                    region={{
                      latitude: startCoords ? startCoords.lat : (location?.latitude || 31.9539),
                      longitude: startCoords ? startCoords.lng : (location?.longitude || 35.9106),
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }}
                  >
                    {startCoords && (
                      <Marker
                        draggable
                        coordinate={{ latitude: startCoords.lat, longitude: startCoords.lng }}
                        onDragEnd={(e) => {
                          const coord = e.nativeEvent.coordinate;
                          setStartCoords({ lat: coord.latitude, lng: coord.longitude });
                          setStartAddr('نقطة محددة على الخريطة');
                        }}
                      >
                        <View style={[styles.mapMarker, { backgroundColor: COLORS.success }]}><Ionicons name="location" size={14} color="#FFF" /></View>
                      </Marker>
                    )}
                    {endCoords && (
                      <Marker
                        draggable
                        coordinate={{ latitude: endCoords.lat, longitude: endCoords.lng }}
                        onDragEnd={(e) => {
                          const coord = e.nativeEvent.coordinate;
                          setEndCoords({ lat: coord.latitude, lng: coord.longitude });
                          setEndAddr('وجهة محددة على الخريطة');
                        }}
                      >
                        <View style={[styles.mapMarker, { backgroundColor: COLORS.danger }]}><Ionicons name="flag" size={14} color="#FFF" /></View>
                      </Marker>
                    )}
                    {routeLine.length > 0 && (
                      <Polyline
                        coordinates={routeLine}
                        strokeColor={TEAL_LIGHT}
                        strokeWidth={4}
                        lineCap="round"
                        lineJoin="round"
                      />
                    )}
                  </MapView>
                  {/* Glass Map Overlay */}
                  <View style={styles.mapGlassOverlay}>
                    <Text style={styles.mapGlassTxt}>الخريطة التفاعلية الفورية</Text>
                    <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', marginTop: 2, fontWeight: '600'}}>انقر على الخريطة لوضع الدبوس، أو اسحبه لتحديد موقعك بدقة</Text>
                  </View>
                </View>

                <View style={styles.routeBlock}>
                  {/* Start */}
                  <View style={styles.routeInputRow}>
                    <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
                    <View style={[styles.routeInput, activeInput === 'start' && { borderColor: TEAL_LIGHT }]}>
                      <TextInput
                        style={styles.routeInputTxt}
                        placeholder="ابحث عن نقطة الانطلاق..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={startAddr}
                        onChangeText={setStartAddr}
                        onFocus={() => setActiveInput('start')}
                        textAlign="right"
                      />
                    </View>
                  </View>

                  {/* Suggestions for Start */}
                  {activeInput === 'start' && (
                    <View style={styles.suggestionsBox}>
                      {location && (
                        <TouchableOpacity
                          style={[styles.suggestionItem, { borderBottomColor: 'rgba(20,184,166,0.3)', marginBottom: 4 }]}
                          onPress={() => {
                            setStartAddr('موقعي الحالي');
                            setStartCoords({lat: location.latitude, lng: location.longitude});
                            setActiveInput(null);
                          }}
                        >
                          <Ionicons name="navigate-circle" size={18} color="#14B8A6" />
                          <Text style={[styles.suggestionTxt, { color: '#14B8A6', fontWeight: 'bold', marginRight: 8 }]} numberOfLines={1}>استخدام موقعي الحالي</Text>
                        </TouchableOpacity>
                      )}
                      {getSuggestions().map((loc, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionItem}
                          onPress={() => { setStartAddr(loc.name); setStartCoords({lat: loc.lat, lng: loc.lng}); setActiveInput(null); }}
                        >
                          <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.5)" />
                          <Text style={styles.suggestionTxt} numberOfLines={1}>{loc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Connector */}
                  <View style={styles.routeConnector}>
                    <View style={styles.routeConnectorLine} />
                  </View>

                  {/* End */}
                  <View style={styles.routeInputRow}>
                    <View style={[styles.routeDot, { backgroundColor: COLORS.danger }]} />
                    <View style={[styles.routeInput, activeInput === 'end' && { borderColor: TEAL_LIGHT }]}>
                      <TextInput
                        style={styles.routeInputTxt}
                        placeholder="ابحث عن الوجهة..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={endAddr}
                        onChangeText={setEndAddr}
                        onFocus={() => setActiveInput('end')}
                        textAlign="right"
                      />
                    </View>
                  </View>

                  {/* Suggestions for End */}
                  {activeInput === 'end' && (
                    <View style={styles.suggestionsBox}>
                      {location && (
                        <TouchableOpacity
                          style={[styles.suggestionItem, { borderBottomColor: 'rgba(20,184,166,0.3)', marginBottom: 4 }]}
                          onPress={() => {
                            setEndAddr('موقعي الحالي');
                            setEndCoords({lat: location.latitude, lng: location.longitude});
                            setActiveInput(null);
                          }}
                        >
                          <Ionicons name="navigate-circle" size={18} color="#14B8A6" />
                          <Text style={[styles.suggestionTxt, { color: '#14B8A6', fontWeight: 'bold', marginRight: 8 }]} numberOfLines={1}>استخدام موقعي الحالي</Text>
                        </TouchableOpacity>
                      )}
                      {getSuggestions().map((loc, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionItem}
                          onPress={() => { setEndAddr(loc.name); setEndCoords({lat: loc.lat, lng: loc.lng}); setActiveInput(null); }}
                        >
                          <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.5)" />
                          <Text style={styles.suggestionTxt} numberOfLines={1}>{loc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                   // Button explicitly moved below the distance field

                {/* Distance Field (Auto-calculated but editable) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}><Ionicons name="resize" size={16}/> المسافة التقديرية (كم)</Text>
                  <View style={styles.fieldInput}>
                    <TextInput
                      style={[styles.fieldInputTxt, { textAlign: 'center' }]}
                      placeholder="15"
                      placeholderTextColor={COLORS.textMuted}
                      value={distance}
                      onChangeText={d => { setDistance(d); calcPrice(d); }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Smart Price Banner */}
                <View style={styles.priceBanner}>
                  <Ionicons name="bulb-outline" size={26} color={TEAL_LIGHT} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.priceBannerTitle}>تسعير مقترح</Text>
                    <Text style={styles.priceBannerTxt}>
                      بناءً على{' '}
                      <Text style={{ fontWeight: FONTS.extraBold }}>{distance} كم</Text>
                      {' '}نقترح:{' '}
                      <Text style={{ color: TEAL_DARK, fontWeight: FONTS.extraBold }}>{price} JOD</Text>
                      {' '}للمقعد
                    </Text>
                  </View>
                </View>
                {/* Inline Next Button when both are filled */}
                {startAddr !== '' && endAddr !== '' && activeInput === null && (
                  <TouchableOpacity 
                    style={[styles.inlineAdvanceBtn, { marginTop: 15 }]} 
                    onPress={() => setStep(3)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                    <Text style={styles.inlineAdvanceTxt}>التالي: تحديد التوقيت</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ══ STEP 3: Time & Schedule ══ */}
            {step === 3 && (
              <View>
                <Text style={styles.stepTitle}>الموعد والجدول</Text>
                <Text style={styles.stepSub}>حدد وقت الانطلاق وأيام التكرار.</Text>

                {/* Departure Time */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}><Ionicons name="time-outline" size={16}/> وقت الانطلاق</Text>
                  <View style={styles.fieldInput}>
                    <TextInput
                      style={[styles.fieldInputTxt, { textAlign: 'center', fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: TEAL_DARK }]}
                      placeholder="07:30"
                      placeholderTextColor={COLORS.textMuted}
                      value={departureTime}
                      onChangeText={setDepartureTime}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>

                {/* Return Time (Visible only for Round Trip) */}
                {tripType === 'round-trip' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}><Ionicons name="time" size={16}/> وقت العودة (إياب)</Text>
                    <View style={styles.fieldInput}>
                      <TextInput
                        style={[styles.fieldInputTxt, { textAlign: 'center', fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: '#EF4444' }]}
                        placeholder="17:00"
                        placeholderTextColor={COLORS.textMuted}
                        value={returnTime}
                        onChangeText={setReturnTime}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                )}

                {/* Recurring Toggle */}
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}><Ionicons name="repeat" size={16}/> تكرار أسبوعي</Text>
                    <Text style={styles.toggleSub}>تحويلها لرحلة مجدولة تلقائياً</Text>
                  </View>
                  <Switch
                    value={recurring}
                    onValueChange={setRecurring}
                    trackColor={{ true: TEAL_LIGHT, false: COLORS.border }}
                    thumbColor={COLORS.white}
                  />
                </View>

                {/* Days Picker */}
                {recurring && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}><Ionicons name="calendar-outline" size={16}/> أيام الجدول</Text>
                    <View style={styles.daysWrap}>
                      {DAYS.map(d => {
                        const sel = selectedDays.includes(d.id);
                        return (
                          <TouchableOpacity
                            key={d.id}
                            style={[styles.dayChip, sel && styles.dayChipSel]}
                            onPress={() => toggleDay(d.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.dayChipTxt, sel && styles.dayChipTxtSel]}>{d.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Seats Stepper */}
                <View style={styles.stepperRow}>
                  <Text style={styles.toggleTitle}><Ionicons name="car-sport-outline" size={16}/> المقاعد المتاحة</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => setSeats(Math.max(1, seats - 1))} activeOpacity={0.7}>
                      <Text style={styles.stepperBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{seats}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => setSeats(Math.min(8, seats + 1))} activeOpacity={0.7}>
                      <Text style={styles.stepperBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Price */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}><Ionicons name="cash-outline" size={16}/> سعر المقعد (JOD)</Text>
                  <View style={styles.fieldInput}>
                    <TextInput
                      style={[styles.fieldInputTxt, { textAlign: 'center', fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: TEAL_DARK }]}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <TouchableOpacity 
                    style={[styles.inlineAdvanceBtn, { marginTop: 24 }]} 
                    onPress={() => setStep(4)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                    <Text style={styles.inlineAdvanceTxt}>التالي: تحديد التفضيلات</Text>
                  </TouchableOpacity>
              </View>
            )}

            {/* ══ STEP 4: Preferences ══ */}
            {step === 4 && (
              <View>
                <Text style={styles.stepTitle}>تفضيلات الرحلة</Text>
                <Text style={styles.stepSub}>حدد شروط الرحلة وأي ملاحظات للركاب.</Text>

                <View style={styles.prefsCard}>
                  {[
                    { icon: 'logo-no-smoking', label: 'يُسمح بالتدخين',       val: smoking, set: setSmoking },
                    { icon: 'musical-notes', label: 'تشغيل الموسيقى مسموح', val: music,   set: setMusic },
                    { icon: 'paw', label: 'الحيوانات الأليفة مقبولة', val: pets, set: setPets },
                  ].map((item, i) => (
                    <View
                      key={i}
                      style={[styles.prefRow, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}
                    >
                      <View style={styles.prefLeft}>
                        <Ionicons name={item.icon as any} size={22} color="#14B8A6" />
                        <Text style={styles.prefLabel}>{item.label}</Text>
                      </View>
                      <Switch
                        value={item.val}
                        onValueChange={item.set}
                        trackColor={{ true: TEAL_LIGHT, false: '#0F172A' }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  ))}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}><Ionicons name="document-text-outline" size={16}/> ملاحظات إضافية (اختياري)</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="أي شروط أو مسارات دقيقة تريد إبلاغ الركاب بها..."
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    textAlign="right"
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity 
                    style={[styles.inlineAdvanceBtn, { marginTop: 10 }]} 
                    onPress={() => setStep(5)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                    <Text style={styles.inlineAdvanceTxt}>مراجعة ونشر الرحلة</Text>
                  </TouchableOpacity>
              </View>
            )}

            {/* ══ STEP 5: Review & Publish ══ */}
            {step === 5 && (
              <View>
                <Text style={styles.stepTitle}>مراجعة ونشر</Text>
                <Text style={styles.stepSub}>تأكد من التفاصيل قبل نشر رحلتك للركاب.</Text>

                {/* Ticket UI */}
                <View style={styles.ticket}>
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketTitle}><Ionicons name="ticket" size={16}/> تذكرة الكابتن</Text>
                    <View style={[styles.ticketBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                      <Text style={[styles.ticketBadgeTxt, { color: '#FFF' }]}>
                        <Ionicons name={TRIP_TYPES.find(t => t.id === tripType)?.icon as any} size={12} /> {TRIP_TYPES.find(t => t.id === tripType)?.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ticketRoute}>
                    <View style={styles.ticketRouteRow}>
                      <Text style={styles.ticketAddr} numberOfLines={2}>{startAddr || '—'}</Text>
                      <View style={[styles.ticketDot, { backgroundColor: COLORS.success }]} />
                    </View>
                    <View style={styles.ticketLine} />
                    <View style={styles.ticketRouteRow}>
                      <Text style={styles.ticketAddr} numberOfLines={2}>{endAddr || '—'}</Text>
                      <View style={[styles.ticketDot, { backgroundColor: COLORS.danger }]} />
                    </View>
                  </View>

                  <View style={styles.ticketDivider}>
                    <View style={styles.ticketHole} />
                    <View style={styles.ticketDotLine} />
                    <View style={styles.ticketHole} />
                  </View>

                  <View style={styles.ticketMeta}>
                    {[
                      { lbl: 'الذهاب', val: departureTime, icon: 'time-outline' },
                      ...(tripType === 'round-trip' ? [{ lbl: 'العودة', val: returnTime, icon: 'time' }] : []),
                      { lbl: 'التسعيرة', val: `${price} JOD`, icon: 'cash' },
                      { lbl: 'المقاعد', val: `${seats} مقاعد`, icon: 'people' },
                      { lbl: 'المسافة', val: `${distance} كم`, icon: 'resize' },
                      { lbl: 'تكرار', val: recurring ? `${selectedDays.length} أيام` : 'مرة واحدة', icon: 'repeat' },
                    ].map((r, i) => (
                      <View key={i} style={styles.ticketMetaRow}>
                        <Text style={styles.ticketMetaVal}>{r.val}</Text>
                        <Text style={styles.ticketMetaLbl}><Ionicons name={r.icon as any} size={14}/> {r.lbl}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Preferences Summary */}
                <View style={styles.prefsSummary}>
                  {smoking && <Text style={styles.prefChip}><Ionicons name="logo-no-smoking" size={14}/> تدخين</Text>}
                  {music   && <Text style={styles.prefChip}><Ionicons name="musical-notes" size={14}/> موسيقى</Text>}
                  {pets    && <Text style={styles.prefChip}><Ionicons name="paw" size={14}/> حيوانات</Text>}
                  {!smoking && !music && !pets && <Text style={styles.prefChip}><Ionicons name="leaf" size={14}/> صامتة وخالية</Text>}
                </View>

                {notes ? (
                  <View style={styles.notesBanner}>
                    <Text style={styles.notesLabel}><Ionicons name="document-text" size={14}/> ملاحظاتك:</Text>
                    <Text style={styles.notesTxt}>{notes}</Text>
                  </View>
                ) : null}

                <TouchableOpacity 
                    style={[styles.inlineAdvanceBtn, { marginTop: 24, backgroundColor: COLORS.success }]} 
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="rocket" size={20} color="#FFF" />
                    <Text style={styles.inlineAdvanceTxt}>{loading ? 'جاري النشر...' : '🚀 انشر الرحلة الآن'}</Text>
                  </TouchableOpacity>
              </View>
            )}


          </View>{/* end card */}
        </ScrollView>
      </KeyboardAvoidingView>
      )}{/* end step !== 2 */}

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  // Header BG
  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 220,
    overflow: 'hidden', 
  },
  bgCircle1: { position: 'absolute', top: -40, right: -50, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(20,184,166,0.15)', opacity: 0.6 },
  bgCircle2: { position: 'absolute', bottom: -20, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(249,115,22,0.1)', opacity: 0.6 },

  // App Bar
  appBar: {
    paddingTop: Platform.OS === 'ios' ? 58 : 46, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  appBarTitle: { fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: COLORS.white },

  // Progress
  progressWrap: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, position: 'relative' },
  progressLineBg: { position: 'absolute', top: 17, left: SPACING.xl + 17, right: SPACING.xl + 17, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, transform: [{ scaleX: -1 }] },
  progressLineFill: { height: '100%', backgroundColor: TEAL_LIGHT, borderRadius: 2 },
  stepsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', gap: 5 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: '#0F172A' },
  stepDone:    { backgroundColor: TEAL_LIGHT, borderColor: TEAL_LIGHT },
  stepActive:  { backgroundColor: TEAL_DARK, borderColor: TEAL_LIGHT, elevation: 8, shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6 },
  stepPending: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' },
  stepNumTxt:  { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: 'rgba(255,255,255,0.5)' },
  stepLbl:     { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: FONTS.bold },
  stepLblActive: { color: COLORS.white },

  // Card
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 160 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 420,
  },
  stepTitle: { fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: '#FFFFFF', textAlign: 'right', marginBottom: 6 },
  stepSub: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginBottom: SPACING.lg },

  // Step 1 - Trip Types
  typeList: { gap: SPACING.md },
  typeCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: SPACING.md },
  typeCardSel: { backgroundColor: 'rgba(20,184,166,0.15)', borderColor: TEAL_LIGHT },
  typeIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  typeIconSel: { backgroundColor: TEAL_DARK },
  typeInfo: { flex: 1, alignItems: 'flex-end' },
  typeName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: '#FFFFFF', marginBottom: 3 },
  typeDesc: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioOuterSel: { borderColor: TEAL_LIGHT },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: TEAL_LIGHT },

  // Step 2 - Route
  mapCard: { height: 180, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mapMarker: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5 },
  mapGlassOverlay: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mapGlassTxt: { fontSize: 11, fontWeight: '900', color: TEAL_LIGHT },
  inlineAdvanceBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL_DARK, borderRadius: RADIUS.full, paddingVertical: 14, marginBottom: SPACING.md, shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  inlineAdvanceTxt: { fontSize: FONTS.base, fontWeight: FONTS.extraBold, color: '#FFF' },

  routeBlock: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: SPACING.lg },
  routeInputRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.md },
  routeDot: { width: 14, height: 14, borderRadius: 7 },
  routeInput: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  routeInputTxt: { paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONTS.base, color: '#FFFFFF' },
  routeConnector: { paddingLeft: 7, paddingVertical: 4 },
  routeConnectorLine: { width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: -1 },
  suggestionsBox: { paddingRight: 40, marginTop: 4, marginBottom: 8 },
  suggestionItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  suggestionTxt: { color: 'rgba(255,255,255,0.85)', fontSize: FONTS.sm, fontWeight: '600', marginRight: 8 },
  priceBanner: { flexDirection: 'row-reverse', backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)', gap: 12, alignItems: 'center' },
  priceBannerTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: TEAL_LIGHT, marginBottom: 3, textAlign: 'right' },
  priceBannerTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right', lineHeight: 18 },

  // Shared Field
  fieldGroup: { marginBottom: SPACING.lg },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: '#FFFFFF', textAlign: 'right', marginBottom: 12 },
  fieldInput: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  fieldInputTxt: { paddingHorizontal: SPACING.md, paddingVertical: 13, fontSize: FONTS.base, color: '#FFFFFF' },

  // Step 3
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: SPACING.lg },
  toggleTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: '#FFFFFF', textAlign: 'right', marginBottom: 2 },
  toggleSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  daysWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dayChipSel: { backgroundColor: TEAL_DARK, borderColor: TEAL_LIGHT },
  dayChipTxt: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: 'rgba(255,255,255,0.6)' },
  dayChipTxtSel: { color: COLORS.white },
  stepperRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: SPACING.lg },
  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: RADIUS.lg, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  stepperBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperBtnTxt: { fontSize: 24, fontWeight: '400', color: TEAL_LIGHT },
  stepperVal: { fontSize: 22, fontWeight: FONTS.extraBold, color: '#FFFFFF', minWidth: 28, textAlign: 'center' },

  // Step 4 - Preferences
  prefsCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: SPACING.lg, overflow: 'hidden' },
  prefRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  prefLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.md },
  prefLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: '#FFFFFF' },
  textArea: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: SPACING.md, fontSize: FONTS.base, color: '#FFFFFF', minHeight: 90 },

  // Step 5 - Ticket
  ticket: { backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: TEAL_DARK, overflow: 'hidden', marginBottom: SPACING.md },
  ticketHeader: { padding: SPACING.base, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: TEAL_DARK },
  ticketTitle: { color: COLORS.white, fontSize: FONTS.base, fontWeight: FONTS.extraBold },
  ticketBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  ticketBadgeTxt: { fontSize: 11, fontWeight: FONTS.bold },
  ticketRoute: { padding: SPACING.base, gap: 8 },
  ticketRouteRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.md },
  ticketDot: { width: 12, height: 12, borderRadius: 6 },
  ticketAddr: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: '#FFFFFF', textAlign: 'right' },
  ticketLine: { height: 18, width: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 5 },
  ticketDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  ticketHole: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: TEAL_DARK, marginHorizontal: -8 },
  ticketDotLine: { flex: 1, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },
  ticketMeta: { padding: SPACING.base, gap: 12 },
  ticketMetaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  ticketMetaLbl: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.6)' },
  ticketMetaVal: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: '#FFFFFF' },
  prefsSummary: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  prefChip: { backgroundColor: 'rgba(20,184,166,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, fontSize: 11, color: TEAL_LIGHT, fontWeight: FONTS.bold, borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)' } as any,
  // Notes
  notesBanner: { backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: RADIUS.lg, padding: SPACING.md, borderLeftWidth: 4, borderLeftColor: '#F97316' },
  notesLabel: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: '#F97316', marginBottom: 4 },
  notesTxt: { fontSize: FONTS.sm, color: '#FFF', textAlign: 'right', lineHeight: 20 },
});

export default CreateTripScreen;
