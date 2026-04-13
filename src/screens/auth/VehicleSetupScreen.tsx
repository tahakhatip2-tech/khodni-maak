import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions, StatusBar,
  Image, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const TEAL = '#14B8A6';
const TEAL_DIM = 'rgba(20,184,166,0.25)';

const vehicleTypes = [
  { id: 'sedan',  iconName: 'car-outline' as const,    label: 'سيدان'  },
  { id: 'suv',    iconName: 'car-sport-outline' as const, label: 'SUV'  },
  { id: 'van',    iconName: 'bus-outline' as const,    label: 'فان'    },
  { id: 'pickup', iconName: 'construct-outline' as const, label: 'بيكاب' },
];

const VehicleSetupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { updateUser } = useAuth();
  const [vehicleType, setVehicleType] = useState('sedan');
  const [model,  setModel]  = useState('');
  const [color,  setColor]  = useState('');
  const [plate,  setPlate]  = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!vehicleType || !model || !color || !plate) {
      return Alert.alert('', 'يرجى إكمال جميع بيانات مركبتك للمتابعة');
    }
    setLoading(true);
    try {
      await updateUser({ vehicle: { type: vehicleType, model, color, plateNumber: plate } });
    } catch {
      Alert.alert('خطأ', 'فشل حفظ بيانات المركبة، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Same 3D background as all auth screens ── */}
      <ImageBackground
        source={require('../../../assets/images/welcome_bg_3d.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(26,31,60,0.15)', 'rgba(26,31,60,0.55)', 'rgba(26,31,60,0.97)']}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: Logo + Title ── */}
        <View style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>Khodni</Text>
            <Text style={styles.titleOrange}>Maak</Text>
          </View>
          <View style={styles.rolePill}>
            <Ionicons name="car-sport" size={14} color={TEAL} style={{ marginLeft: 6 }} />
            <Text style={styles.rolePillText}>إعداد مركبة الكابتن</Text>
          </View>
          <Text style={styles.headerSub}>أكمل ملفك لتبدأ في استقبال الرحلات وكسب دخل إضافي</Text>
        </View>

        {/* ── Glass Form Card ── */}
        <View style={styles.glassCard}>
          <View style={styles.glassHighlight} />

          {/* Vehicle Type Selector */}
          <Text style={styles.sectionLabel}>نوع المركبة</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeGrid}
          >
            {vehicleTypes.map(t => {
              const isActive = vehicleType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeCard, { borderColor: isActive ? TEAL : 'rgba(255,255,255,0.15)', backgroundColor: isActive ? TEAL_DIM : 'rgba(255,255,255,0.06)' }]}
                  onPress={() => setVehicleType(t.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.iconName} size={26} color={isActive ? TEAL : 'rgba(255,255,255,0.55)'} />
                  <Text style={[styles.typeLabel, { color: isActive ? TEAL : 'rgba(255,255,255,0.6)' }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Model */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>الموديل وسنة الصنع</Text>
            <View style={styles.inputWrapper}>
              <View style={[styles.iconBox, { backgroundColor: TEAL + '25' }]}>
                <Ionicons name="car-sport-outline" size={18} color={TEAL} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="مثال: تويوتا كامري 2023"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={model}
                onChangeText={setModel}
                textAlign="right"
              />
            </View>
          </View>

          {/* Color */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>اللون الرئيسي</Text>
            <View style={styles.inputWrapper}>
              <View style={[styles.iconBox, { backgroundColor: TEAL + '25' }]}>
                <Ionicons name="color-palette-outline" size={18} color={TEAL} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="مثال: لؤلؤي أبيض، فضي"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={color}
                onChangeText={setColor}
                textAlign="right"
              />
            </View>
          </View>

          {/* License Plate */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>رقم لوحة المركبة</Text>
            <View style={styles.inputWrapper}>
              <View style={[styles.iconBox, { backgroundColor: TEAL + '25' }]}>
                <Ionicons name="card-outline" size={18} color={TEAL} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="مثال: 12-34567"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={plate}
                onChangeText={setPlate}
                textAlign="right"
                keyboardType="visible-password"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={TEAL} />
            <Text style={styles.submitBtnText}>
              {loading ? 'جاري توثيق المركبة...' : 'حفظ بيانات المركبة'}
            </Text>
            <Ionicons name="car-sport" size={20} color={TEAL} />
          </TouchableOpacity>

          {/* Info note */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={TEAL} style={{ marginLeft: 8 }} />
            <Text style={styles.infoText}>بيانات مركبتك ستظهر للركاب عند قبولك لرحلاتهم فقط، لضمان الموثوقية والأمان.</Text>
          </View>
        </View>

        {/* Skip link */}
        <TouchableOpacity style={styles.skipWrap} onPress={() => {}} activeOpacity={0.7}>
          <Text style={styles.skipText}>تخطي مؤقتاً — يمكنك إضافة المركبة لاحقاً</Text>
        </TouchableOpacity>

        <View style={styles.footerSig}>
          <Text style={styles.footerText}>Made with 🤍 by Eng. Taha Al-Khatib</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1F3C' },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 56,
    paddingBottom: 50,
  },

  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 88, height: 88, marginBottom: -4 },
  titleRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  titleWhite: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  titleOrange: { fontSize: 30, fontWeight: '900', color: '#F97316', letterSpacing: 1 },
  rolePill: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1.5, borderColor: TEAL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8 },
  rolePillText: { fontSize: 13, fontWeight: '800', color: TEAL },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textAlign: 'center' },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(20,25,45,0.55)',
    borderRadius: 32, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden', marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 24 },
      android: { elevation: 10 }
    })
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginBottom: 12 },

  typeGrid: { flexDirection: 'row-reverse', gap: 10, paddingBottom: 4, marginBottom: 20 },
  typeCard: {
    width: 80, borderRadius: 18, borderWidth: 1.5,
    paddingVertical: 14, alignItems: 'center', gap: 8,
  },
  typeLabel: { fontSize: 12, fontWeight: '800' },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, height: 56,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#FFFFFF', fontWeight: '700' },

  submitBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    borderRadius: 22, borderWidth: 1.5, borderColor: TEAL,
    height: 58, backgroundColor: 'transparent', marginTop: 8, marginBottom: 16, gap: 10,
  },
  submitBtnText: { fontSize: 17, fontWeight: '900', color: TEAL },

  infoBox: { flexDirection: 'row-reverse', alignItems: 'flex-start', backgroundColor: 'rgba(20,184,166,0.1)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(20,184,166,0.25)' },
  infoText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'right', lineHeight: 20, fontWeight: '600' },

  skipWrap: { alignItems: 'center', marginBottom: 20 },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },

  footerSig: { alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700' },
});

export default VehicleSetupScreen;
