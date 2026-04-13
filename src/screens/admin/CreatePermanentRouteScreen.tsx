import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, StatusBar, Alert, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { permanentRouteService, PermanentRoute } from '../../services/permanentRouteService';

const NAVY    = '#0F172A';
const VIOLET  = '#6D28D9';
const VIOLET_L = '#8B5CF6';
const GREEN   = '#10B981';

const DAYS = [
  { key: 'sun', label: 'الأحد' },
  { key: 'mon', label: 'الاثنين' },
  { key: 'tue', label: 'الثلاثاء' },
  { key: 'wed', label: 'الأربعاء' },
  { key: 'thu', label: 'الخميس' },
  { key: 'fri', label: 'الجمعة' },
  { key: 'sat', label: 'السبت' },
];

interface Props {
  navigation: any;
  route: any; // يحتوي على route.params.route إذا كنا نعدّل
}

const CreatePermanentRouteScreen: React.FC<Props> = ({ navigation, route: navRoute }) => {
  const editingRoute: PermanentRoute | undefined = navRoute.params?.route;
  const isEditing = !!editingRoute;

  // ── Form State ──────────────────────────────────────
  const [name, setName] = useState(editingRoute?.name || '');
  const [description, setDescription] = useState(editingRoute?.description || '');
  const [fromAddress, setFromAddress] = useState(editingRoute?.startLocation.address || '');
  const [toAddress, setToAddress] = useState(editingRoute?.endLocation.address || '');
  const [waypoints, setWaypoints] = useState<string[]>(editingRoute?.waypoints?.map((w: any) => w.address) || []);
  const [departureTime, setDepartureTime] = useState(editingRoute?.departureTime || '07:30');
  const [duration, setDuration] = useState(String(editingRoute?.estimatedDuration || '60'));
  const [price, setPrice] = useState(String(editingRoute?.pricePerSeat || ''));
  const [maxCaptains, setMaxCaptains] = useState(String(editingRoute?.maxCaptains || '5'));
  const [seatsPerCaptain, setSeatsPerCaptain] = useState(String(editingRoute?.seatsPerCaptain || '4'));
  const [selectedDays, setSelectedDays] = useState<string[]>(editingRoute?.daysOfWeek || ['sun', 'mon', 'tue', 'wed', 'thu']);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addWaypoint = () => {
    if (waypoints.length >= 5) {
      Alert.alert('تنبيه', 'الحد الأقصى للمحطات الوسيطة هو 5 محطات');
      return;
    }
    setWaypoints([...waypoints, '']);
  };

  const updateWaypoint = (text: string, index: number) => {
    const newWp = [...waypoints];
    newWp[index] = text;
    setWaypoints(newWp);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const selectWorkdays = () => setSelectedDays(['sun', 'mon', 'tue', 'wed', 'thu']);
  const selectAll = () => setSelectedDays(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);

  const validate = (): string | null => {
    if (!name.trim())        return 'اسم المسار مطلوب';
    if (!fromAddress.trim()) return 'نقطة البداية مطلوبة';
    if (!toAddress.trim())   return 'نقطة الوصول مطلوبة';
    if (!price.trim() || isNaN(Number(price))) return 'السعر مطلوب ويجب أن يكون رقماً';
    if (selectedDays.length === 0) return 'اختر يوماً واحداً على الأقل';
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime)) return 'أدخل وقت الانطلاق بالتنسيق HH:MM (مثال: 07:30)';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) { Alert.alert('تنبيه', error); return; }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        startLocation: {
          type: 'Point' as const,
          coordinates: [0, 0],  // في التطبيق الحقيقي: من خريطة
          address: fromAddress.trim(),
        },
        endLocation: {
          type: 'Point' as const,
          coordinates: [0, 0],
          address: toAddress.trim(),
        },
        waypoints: waypoints
          .filter(wp => wp.trim() !== '')
          .map(wp => ({
            type: 'Point' as const,
            coordinates: [0, 0],
            address: wp.trim()
          })),
        departureTime,
        estimatedDuration: Number(duration) || 60,
        daysOfWeek: selectedDays,
        pricePerSeat: Number(price),
        maxCaptains: Number(maxCaptains) || 5,
        seatsPerCaptain: Number(seatsPerCaptain) || 4,
      };

      if (isEditing) {
        await permanentRouteService.updateRoute(editingRoute!._id, payload);
        Alert.alert('✅ تم التحديث', 'تم تحديث المسار بنجاح', [
          { text: 'حسناً', onPress: () => navigation.goBack() }
        ]);
      } else {
        await permanentRouteService.createRoute(payload);
        Alert.alert('✅ تم الإنشاء', `تم إنشاء مسار "${name}" بنجاح.\nسيظهر للكباتن فوراً.`, [
          { text: 'حسناً', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType, hint }: any) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          textAlign="right"
          keyboardType={keyboardType || 'default'}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={[NAVY, '#110D2E', NAVY]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(109,40,217,0.2)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'تعديل المسار' : 'مسار دائم جديد'}</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="bus" size={22} color={VIOLET_L} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── اسم المسار ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bookmark-outline" size={18} color={VIOLET_L} />
            <Text style={styles.sectionTitle}>معلومات المسار</Text>
          </View>
          <InputField label="اسم المسار *" value={name} onChangeText={setName} placeholder='مثال: خط عمّان - الزرقاء' />
          <InputField label="وصف اختياري" value={description} onChangeText={setDescription} placeholder="تفاصيل إضافية عن المسار..." />
        </View>

        {/* ── نقاط المسار ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate-outline" size={18} color={GREEN} />
            <Text style={styles.sectionTitle}>نقاط المسار</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>نقطة الانطلاق *</Text>
            <View style={[styles.inputWrap, { borderColor: GREEN + '60' }]}>
              <Ionicons name="location" size={16} color={GREEN} style={{ marginLeft: 8 }} />
              <TextInput
                style={styles.input}
                value={fromAddress}
                onChangeText={setFromAddress}
                placeholder="عنوان نقطة البداية"
                placeholderTextColor="rgba(255,255,255,0.3)"
                textAlign="right"
              />
            </View>
          </View>

          <View style={styles.arrowWrap}>
            <View style={styles.arrowLine} />
            <Ionicons name="arrow-down-circle" size={28} color={VIOLET_L} />
            <View style={styles.arrowLine} />
          </View>

          {waypoints.map((wp, i) => (
             <View key={i} style={styles.waypointWrap}>
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>محطة فرعية {i + 1}</Text>
                  <View style={[styles.inputWrap, { borderColor: '#60A5FA60' }]}>
                    <TouchableOpacity onPress={() => removeWaypoint(i)} style={{ marginLeft: 8, padding: 4 }}>
                       <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.input}
                      value={wp}
                      onChangeText={(t) => updateWaypoint(t, i)}
                      placeholder={`عنوان المحطة ${i + 1}`}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      textAlign="right"
                    />
                  </View>
                </View>
                <View style={styles.arrowWrap}>
                  <View style={styles.arrowLine} />
                  <Ionicons name="location-outline" size={24} color="#60A5FA" />
                  <View style={styles.arrowLine} />
                </View>
             </View>
          ))}

          <TouchableOpacity style={styles.addWpBtn} onPress={addWaypoint}>
            <Ionicons name="add-circle-outline" size={18} color={VIOLET_L} />
            <Text style={styles.addWpTxt}>إضافة محطة فرعية</Text>
          </TouchableOpacity>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>نقطة الوصول *</Text>
            <View style={[styles.inputWrap, { borderColor: '#F97316' + '60' }]}>
              <Ionicons name="flag" size={16} color="#F97316" style={{ marginLeft: 8 }} />
              <TextInput
                style={styles.input}
                value={toAddress}
                onChangeText={setToAddress}
                placeholder="عنوان نقطة الوصول"
                placeholderTextColor="rgba(255,255,255,0.3)"
                textAlign="right"
              />
            </View>
          </View>
        </View>

        {/* ── الجدول الزمني ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>الجدول الزمني</Text>
          </View>

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <InputField
                label="وقت الانطلاق *"
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholder="07:30"
                hint="التنسيق: HH:MM"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="المدة (دقائق)"
                value={duration}
                onChangeText={setDuration}
                placeholder="60"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* أيام الأسبوع */}
          <Text style={styles.fieldLabel}>أيام الأسبوع *</Text>
          <View style={styles.quickDays}>
            <TouchableOpacity style={styles.quickDayBtn} onPress={selectWorkdays} activeOpacity={0.8}>
              <Text style={styles.quickDayTxt}>أيام العمل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickDayBtn} onPress={selectAll} activeOpacity={0.8}>
              <Text style={styles.quickDayTxt}>كل الأيام</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.daysGrid}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day.key}
                style={[styles.dayChip, selectedDays.includes(day.key) && styles.dayChipActive]}
                onPress={() => toggleDay(day.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayChipTxt, selectedDays.includes(day.key) && styles.dayChipTxtActive]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── السعر والمقاعد ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>السعر والطاقة الاستيعابية</Text>
          </View>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <InputField label="السعر / مقعد (د.أ) *" value={price} onChangeText={setPrice} placeholder="3.5" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="مقاعد / مركبة" value={seatsPerCaptain} onChangeText={setSeatsPerCaptain} placeholder="4" keyboardType="number-pad" />
            </View>
          </View>
          <InputField
            label="أقصى عدد كباتن على المسار"
            value={maxCaptains}
            onChangeText={setMaxCaptains}
            placeholder="5"
            keyboardType="number-pad"
            hint="عدد السيارات المسموح بها على هذا المسار"
          />
        </View>

        {/* ── زر الحفظ ── */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={22} color="#FFF" />
              <Text style={styles.submitTxt}>{isEditing ? 'حفظ التعديلات' : 'إنشاء المسار'}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: {
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(109,40,217,0.2)', alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 24 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '900' },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  fieldHint: { color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'right', marginBottom: 6, marginTop: -4 },
  inputWrap: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '700' },

  twoCol: { flexDirection: 'row-reverse', gap: 12 },

  arrowWrap: { alignItems: 'center', marginVertical: 4, gap: 4 },
  arrowLine: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  waypointWrap: { marginBottom: 4 },
  addWpBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1, borderColor: VIOLET_L + '40', paddingVertical: 10, borderRadius: 12, marginBottom: 12, marginTop: 8 },
  addWpTxt: { color: VIOLET_L, fontSize: 13, fontWeight: '800' },

  quickDays: { flexDirection: 'row-reverse', gap: 8, marginBottom: 10 },
  quickDayBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(109,40,217,0.15)', borderWidth: 1, borderColor: VIOLET_L + '40',
  },
  quickDayTxt: { color: VIOLET_L, fontSize: 12, fontWeight: '800' },

  daysGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  dayChipActive: { backgroundColor: VIOLET, borderColor: VIOLET_L },
  dayChipTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
  dayChipTxtActive: { color: '#FFF' },

  submitBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 58, borderRadius: 18,
    backgroundColor: VIOLET,
    borderWidth: 1, borderColor: VIOLET_L,
    marginTop: 8,
    shadowColor: VIOLET,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  submitTxt: { color: '#FFF', fontSize: 17, fontWeight: '900' },
});

export default CreatePermanentRouteScreen;
