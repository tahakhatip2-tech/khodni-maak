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
    title: 'تسجيل دخول الراكب',
    sub: 'اطلب رحلتك بضغطة واحدة'
  },
  captain: {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    accent: '#14B8A6',
    light: '#F0FDFA',
    iconName: 'car-sport' as const,
    title: 'تسجيل دخول الكابتن',
    sub: 'شارك مسارك واكسب ثقة ركابك'
  },
  default: {
    primary: '#1A1F3C',
    primaryDark: '#0F1228',
    accent: '#3B82F6',
    light: '#F8FAFC',
    iconName: 'navigate' as const,
    title: 'تسجيل الدخول',
    sub: 'مرحباً بعودتك إلى خذني معاك'
  }
};

const LoginScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});

  const roleKey = route?.params?.preselectedRole as keyof typeof THEMES || 'default';
  const activeTheme = THEMES[roleKey] || THEMES.default;

  const validate = () => {
    const errs: typeof errors = {};
    if (!phone.trim()) errs.phone = 'رقم الهاتف مطلوب';
    else if (phone.trim().length < 9) errs.phone = 'رقم هاتف غير صحيح';
    if (!password.trim()) errs.password = 'كلمة المرور مطلوبة';
    else if (password.length < 6) errs.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err: any) {
      Alert.alert('خطأ', err?.response?.data?.message || 'فشل تسجيل الدخول، تحقق من بياناتك');
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
        {/* Gradient overlay – darkens toward bottom for form readability */}
        <LinearGradient
          colors={['rgba(26,31,60,0.15)', 'rgba(26,31,60,0.5)', 'rgba(26,31,60,0.97)']}
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
              <Text style={styles.titleAccent}>Maak</Text>
            </View>
            <View style={[styles.rolePill, { borderColor: activeTheme.accent }]}>
              <Ionicons name={activeTheme.iconName} size={14} color={activeTheme.accent} style={{ marginLeft: 6 }} />
              <Text style={[styles.rolePillText, { color: activeTheme.accent }]}>{activeTheme.title}</Text>
            </View>
            <Text style={styles.headerSub}>{activeTheme.sub}</Text>
          </View>

          {/* 🪟 Glass Form Card */}
          <View style={styles.glassCard}>
            <View style={styles.glassHighlight} />

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
                  onChangeText={t => { setPhone(t); setErrors(e => ({ ...e, phone: undefined })); }}
                  textAlign="right"
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
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
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }}
                  textAlign="right"
                />
                <View style={[styles.iconBox, { backgroundColor: activeTheme.accent + '25', marginLeft: 8 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={activeTheme.accent} />
                </View>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={{ alignSelf: 'flex-start' }} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: activeTheme.accent }]}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { borderColor: activeTheme.accent }, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={22} color={activeTheme.accent} />
              <Text style={[styles.submitBtnText, { color: activeTheme.accent }]}>
                {loading ? 'جاري التحقق...' : 'تأكيد الدخول'}
              </Text>
              <Ionicons name={activeTheme.iconName} size={20} color={activeTheme.accent} />
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerWrap}>
            <Text style={styles.registerText}>ليس لديك حساب؟ </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register', { preselectedRole: roleKey })} activeOpacity={0.7}>
              <Text style={[styles.registerLink, { color: activeTheme.accent }]}>سجّل الآن</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
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

  headerSection: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 90, height: 90, marginBottom: -6 },
  titleRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  titleWhite: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  titleAccent: { fontSize: 34, fontWeight: '900', color: '#F97316', letterSpacing: 1 },

  rolePill: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8 },
  rolePillText: { fontSize: 13, fontWeight: '800' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textAlign: 'center' },

  // Glass Card
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

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginBottom: 8 },

  inputWrapper: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, height: 56,
  },
  inputError: { borderColor: '#F87171', backgroundColor: 'rgba(239,68,68,0.1)' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  eyeBtn: { padding: 8 },
  errorText: { fontSize: 11, color: '#F87171', textAlign: 'right', fontWeight: '700', marginTop: 4 },

  forgotText: { fontSize: 13, fontWeight: '800', marginTop: -4 },

  submitBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    borderRadius: 22, borderWidth: 1.5, height: 58,
    backgroundColor: 'transparent', marginTop: 20, gap: 10,
  },
  submitBtnText: { fontSize: 17, fontWeight: '900' },

  registerWrap: { flexDirection: 'row-reverse', justifyContent: 'center', marginBottom: 24 },
  registerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  registerLink: { fontSize: 14, fontWeight: '900' },

  footerSig: { alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
});

export default LoginScreen;
