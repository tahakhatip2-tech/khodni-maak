import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, KeyboardAvoidingView, Platform, StatusBar, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../context/LocationContext';
import { searchRequestService } from '../../services/searchRequestService';

const { width } = Dimensions.get('window');
const BLUE = '#3B82F6';
const NAVY = '#0F172A';

const TRIP_TYPES = [
  { id: 'one-way', label: 'رحلة لمرة واحدة', icon: 'arrow-forward' },
  { id: 'round-trip', label: 'ذهاب وإياب', icon: 'sync' },
];

const AMMAN_LOCATIONS = [
  { name: 'الجامعة الأردنية, عمان', lat: 32.0135, lng: 35.8718 },
  { name: 'مكة مول, شارع مكة', lat: 31.9793, lng: 35.8456 },
  { name: 'الدوار السابع, عمان', lat: 31.9566, lng: 35.8580 },
];

const CreateSearchRequestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { location } = useLocation();
  const [loading, setLoading] = useState(false);

  // Form State
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [startAddr, setStartAddr] = useState('');
  const [endAddr, setEndAddr] = useState('');
  const [startCoords, setStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [endCoords, setEndCoords] = useState<{lat: number, lng: number} | null>(null);
  const [departureTime, setDepartureTime] = useState('07:30');
  const [returnTime, setReturnTime] = useState('17:00');
  const [flexibleTime, setFlexibleTime] = useState(true);
  const [minSeats, setMinSeats] = useState(1);
  const [maxPrice, setMaxPrice] = useState('');

  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);

  const getSuggestions = (query: string) => {
    if (!query) return AMMAN_LOCATIONS;
    return AMMAN_LOCATIONS.filter(l => l.name.includes(query)).slice(0, 3);
  };

  const handleSubmit = async () => {
    if (!startAddr || !endAddr) {
      Alert.alert('تنبيه', 'يرجى تحديد نقطة الانطلاق والوجهة');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const [hh, mm] = departureTime.split(':').map(Number);
      const dept = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh || 7, mm || 30);
      if (dept <= now) dept.setDate(dept.getDate() + 1);

      let retDept: Date | undefined;
      if (tripType === 'round-trip') {
        const [rh, rm] = returnTime.split(':').map(Number);
        retDept = new Date(dept.getFullYear(), dept.getMonth(), dept.getDate(), rh || 17, rm || 0);
        if (retDept <= dept) retDept.setDate(retDept.getDate() + 1);
      }

      await searchRequestService.createRequest({
        tripType,
        startLocation: {
          type: 'Point',
          coordinates: [startCoords?.lng || 35.9, startCoords?.lat || 31.9],
          address: startAddr,
        },
        endLocation: {
          type: 'Point',
          coordinates: [endCoords?.lng || 35.9, endCoords?.lat || 31.9],
          address: endAddr,
        },
        departureTime: dept.toISOString(),
        returnTime: retDept ? retDept.toISOString() : undefined,
        flexibleTime,
        minSeats,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      });

      Alert.alert('تم بنجاح', 'لقد سجلنا طلبك الذكي! سنرسل لك إشعاراً فور أن يتطابق طلبك مع مسار كابتن.', [
        { text: 'حسناً', onPress: () => navigation.replace('PassengerTabs', { screen: 'MyBookings' }) }
      ]);
    } catch (err: any) {
      if (err?.response?.data?.alreadyExists) {
         Alert.alert('تنبيه', err?.response?.data?.message, [{ text: 'حسناً', onPress: () => navigation.goBack() }]);
      } else {
         Alert.alert('خطأ', err?.response?.data?.message || 'واجهنا مشكلة، يرجى المحاولة مرة أخرى.');
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(59,130,246,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>أخبرنا وجهتك</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Type */}
        <Text style={styles.sectionTitle}>نوع الطلب</Text>
        <View style={styles.typeRow}>
          {TRIP_TYPES.map(t => (
            <TouchableOpacity key={t.id} style={[styles.typeBtn, tripType === t.id && styles.typeBtnActive]} onPress={() => setTripType(t.id as any)}>
              <Ionicons name={t.icon as any} size={18} color={tripType === t.id ? '#FFF' : 'rgba(255,255,255,0.5)'} />
              <Text style={[styles.typeLbl, tripType === t.id && { color: '#FFF' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Route */}
        <Text style={styles.sectionTitle}>من وإلى</Text>
        <View style={styles.card}>
          <View style={styles.inputWrap}>
            <Ionicons name="location" size={18} color="#10B981" />
            <TextInput style={styles.input} placeholder="نقطة الانطلاق (مثال: منزلي)" placeholderTextColor="rgba(255,255,255,0.3)" value={startAddr} onChangeText={setStartAddr} onFocus={() => setActiveInput('start')} textAlign="right" />
          </View>
          {activeInput === 'start' && getSuggestions(startAddr).map(loc => (
            <TouchableOpacity key={loc.name} style={styles.suggItem} onPress={() => { setStartAddr(loc.name); setStartCoords({lat: loc.lat, lng: loc.lng}); setActiveInput(null); }}>
              <Ionicons name="map-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.suggTxt}>{loc.name}</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8, marginLeft: 30 }} />

          <View style={styles.inputWrap}>
            <Ionicons name="flag" size={18} color="#EF4444" />
            <TextInput style={styles.input} placeholder="الوجهة (مثال: العمل)" placeholderTextColor="rgba(255,255,255,0.3)" value={endAddr} onChangeText={setEndAddr} onFocus={() => setActiveInput('end')} textAlign="right" />
          </View>
          {activeInput === 'end' && getSuggestions(endAddr).map(loc => (
            <TouchableOpacity key={loc.name} style={styles.suggItem} onPress={() => { setEndAddr(loc.name); setEndCoords({lat: loc.lat, lng: loc.lng}); setActiveInput(null); }}>
              <Ionicons name="map-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.suggTxt}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time */}
        <Text style={styles.sectionTitle}>توقيت الرحلة</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>وقت الانطلاق (صباحاً)</Text>
            <TextInput style={styles.timeInput} value={departureTime} onChangeText={setDepartureTime} placeholder="07:30" placeholderTextColor="rgba(255,255,255,0.2)" />
          </View>
          {tripType === 'round-trip' && (
            <>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 }} />
              <View style={styles.rowBetween}>
                <Text style={styles.label}>وقت العودة (مساءً)</Text>
                <TextInput style={styles.timeInput} value={returnTime} onChangeText={setReturnTime} placeholder="17:00" placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
            </>
          )}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 }} />
          <View style={styles.rowBetween}>
            <Text style={styles.label}>وقت مرن؟ (±30 دقيقة)</Text>
            <Switch value={flexibleTime} onValueChange={setFlexibleTime} thumbColor="#FFF" trackColor={{ true: BLUE, false: 'rgba(255,255,255,0.2)' }} />
          </View>
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>تفاصيل إضافية</Text>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>المقاعد المطلوبة</Text>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setMinSeats(Math.max(1, minSeats-1))} style={styles.stepperBtn}><Text style={styles.stepperTxt}>-</Text></TouchableOpacity>
              <Text style={styles.stepperVal}>{minSeats}</Text>
              <TouchableOpacity onPress={() => setMinSeats(Math.min(4, minSeats+1))} style={styles.stepperBtn}><Text style={styles.stepperTxt}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 }} />
          <View style={styles.rowBetween}>
            <Text style={styles.label}>الحد الأقصى للسعر المقبول (د.أ)</Text>
            <TextInput style={styles.priceInput} value={maxPrice} onChangeText={setMaxPrice} placeholder="اختياري" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="decimal-pad" />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={[BLUE, '#2563EB']} style={StyleSheet.absoluteFillObject} />
          <Text style={styles.submitTxt}>{loading ? 'جاري الحفظ...' : 'احفظ طلبي الذكي 🚀'}</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : 35, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  
  scroll: { padding: 20, paddingBottom: 100 },
  sectionTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800', textAlign: 'right', marginBottom: 10, marginTop: 10 },
  
  typeRow: { flexDirection: 'row-reverse', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  typeBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  typeLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800' },

  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '700' },
  suggItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  suggTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },

  rowBetween: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  timeInput: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, color: BLUE, fontWeight: '900', fontSize: 16 },
  priceInput: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, color: '#FFF', fontWeight: '800', textAlign: 'center', minWidth: 80 },

  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4 },
  stepperBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  stepperTxt: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  stepperVal: { color: '#FFF', fontSize: 16, fontWeight: '900', width: 24, textAlign: 'center' },

  submitBtn: { height: 56, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  submitTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});

export default CreateSearchRequestScreen;
