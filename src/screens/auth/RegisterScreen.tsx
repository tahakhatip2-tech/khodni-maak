import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Dimensions, StatusBar,
  Image, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const { height, width } = Dimensions.get('window');

const THEMES = {
  passenger: {
    primary: '#F97316',
    primaryDark: '#C2410C',
    accent: '#FB923C',
    light: '#FFF7ED',
    iconName: 'person' as const,
    title: 'حساب راكب جديد',
    sub: 'انضم وابدأ رحلتك الأولى الآن'
  },
  captain: {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    accent: '#14B8A6',
    light: '#F0FDFA',
    iconName: 'car-sport' as const,
    title: 'حساب كابتن جديد',
    sub: 'شارك مسارك واكسب دخلاً إضافياً'
  },
  default: {
    primary: '#8B5CF6',
    primaryDark: '#6D28D9',
    accent: '#A78BFA',
    light: '#F5F3FF',
    iconName: 'sparkles' as const,
    title: 'تسجيل حساب جديد',
    sub: 'مرحباً! أنت على بُعد خطوة واحدة'
  }
};

const RegisterScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roleKey = route?.params?.preselectedRole as keyof typeof THEMES || 'default';
  const activeTheme = THEMES[roleKey] || THEMES.default;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'الاسم يجب أن يكون حرفين على الأقل';
    if (!phone.trim() || phone.trim().length < 9) errs.phone = 'رقم هاتف غير صحيح';
    if (!password || password.length < 6) errs.password = 'كلمة المرور 6 أحرف على الأقل';
    if (password !== confirmPassword) errs.confirmPassword = 'كلمتا المرور غير متطابقتان';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const registerRole = roleKey === 'default' ? 'passenger' : roleKey;
      await register(name.trim(), phone.trim(), password, registerRole);
    } catch (err: any) {
      Alert.alert('خطأ', err?.response?.data?.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require('../../../assets/images/welcome_bg_3d.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(26,31,60,0.15)', 'rgba(26,31,60,0.5)', 'rgba(26,31,60,0.98)']}
          style={StyleSheet.absoluteFillObject}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={styles.headerSection}>
            <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <View style={styles.titleRow}>
              <Text style={styles.titleWhite}>Khodni</Text>
              <Text style={styles.titleOrange}>Maak</Text>
            </View>
            <View style={[styles.rolePill, { borderColor: activeTheme.accent }]}>
              <Ionicons name={activeTheme.iconName} size={14} color={activeTheme.accent} style={{ marginLeft: 6 }} />
              <Text style={[styles.rolePillText, { color: activeTheme.accent }]}>{activeTheme.title}</Text>
            </View>
            <Text style={styles.headerSub}>{activeTheme.sub}</Text>
          </View>

          {/* Glass Form Card */}
          <View style={styles.glassCard}>
            <View style={styles.glassHighlight} />

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>الاسم الكامل</Text>
              <View style={[styles.inputWrapper, errors.name ? styles.inputError : {}]}>
                <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '25' }]}>
                  <Ionicons name="person-outline" size={18} color={activeTheme.accent} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: محمد علي"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={name}
                  onChangeText={t => { setName(t); setErrors(e => ({ ...e, name: '' })); }}
                  textAlign="right"
                />
              </View>
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>رقم الموبايل</Text>
              <View style={[styles.inputWrapper, errors.phone ? styles.inputError : {}]}>
                <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '25' }]}>
                  <Ionicons name="call-outline" size={18} color={activeTheme.accent} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="07X XXX XXXX"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: '' })); }}
                  textAlign="right"
                />
              </View>
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={[styles.inputWrapper, errors.password ? styles.inputError : {}]}>
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn} activeOpacity={0.7}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="6 أحرف أو أرقام على الأقل"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
                  textAlign="right"
                />
                <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '25', marginLeft: 8 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={activeTheme.accent} />
                </View>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>تأكيد كلمة المرور</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputError : {}]}>
                <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '25' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={activeTheme.accent} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="أعد إدخال كلمة المرور"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  secureTextEntry={!showPass}
                  value={confirmPassword}
                  onChangeText={t => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
                  textAlign="right"
                />
              </View>
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { borderColor: activeTheme.accent }, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={22} color={activeTheme.accent} />
              <Text style={[styles.submitBtnText, { color: activeTheme.accent }]}>
                {loading ? 'جاري إنشاء حسابك...' : 'تأكيد التسجيل'}
              </Text>
              <Ionicons name={activeTheme.iconName} size={20} color={activeTheme.accent} />
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginWrap}>
            <Text style={styles.loginText}>لديك حساب بالفعل؟ </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login', { preselectedRole: roleKey })} activeOpacity={0.7}>
              <Text style={[styles.loginLink, { color: activeTheme.accent }]}>تسجيل الدخول</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSig}>
            <Text style={styles.footerText}>Made with 🤍 by Eng. Taha Al-Khatib</Text>
          </View>

        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  bgImage: { flex: 1, width, height },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
  },

  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end', marginBottom: 16,
  },

  headerSection: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 80, height: 80, marginBottom: -4 },
  titleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  titleWhite: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  titleOrange: { fontSize: 30, fontWeight: '900', color: '#F97316', letterSpacing: 1 },

  rolePill: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8 },
  rolePillText: { fontSize: 13, fontWeight: '800' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textAlign: 'center' },

  glassCard: {
    backgroundColor: 'rgba(20,25,45,0.55)',
    borderRadius: 32, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden', marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 24 },
      android: { elevation: 10 }
    })
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginBottom: 8 },

  inputWrapper: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, height: 54,
  },
  inputError: { borderColor: '#F87171', backgroundColor: 'rgba(239,68,68,0.1)' },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  eyeBtn: { padding: 8 },
  errorText: { fontSize: 11, color: '#F87171', textAlign: 'right', fontWeight: '700', marginTop: 4 },

  submitBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    borderRadius: 22, borderWidth: 1.5, height: 58,
    backgroundColor: 'transparent', marginTop: 16, gap: 10,
  },
  submitBtnText: { fontSize: 17, fontWeight: '900' },

  loginWrap: { flexDirection: 'row-reverse', justifyContent: 'center', marginBottom: 24 },
  loginText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  loginLink: { fontSize: 14, fontWeight: '900' },

  footerSig: { alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
});

export default RegisterScreen;
