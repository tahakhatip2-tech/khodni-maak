import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ScrollView, Platform, StatusBar, Animated, Easing,
  Image, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const roles = [
  {
    id: 'passenger',
    iconName: 'person' as const,
    title: 'راكب',
    desc: 'رحلات مريحة أو كابتن فوري لتصل بأمان مع تتبع مباشر.',
    accent: '#FB923C',    // Orange
    glow: 'rgba(249,115,22,0.25)',
    perks: ['🚕 كابتن فوري', '🗺️ تتبع مباشر'],
  },
  {
    id: 'captain',
    iconName: 'car-sport' as const,
    title: 'مُضيف (كابتن)',
    desc: 'شارك مسارك اليومي، حدد وجهتك واكسب دخلاً بمرونة تامة.',
    accent: '#14B8A6',    // Teal
    glow: 'rgba(13,148,136,0.25)',
    perks: ['💰 دخل إضافي', '📍 مرونة الوجهة'],
  },
  {
    id: 'both',
    iconName: 'swap-horizontal' as const,
    title: 'حساب مزدوج',
    desc: 'كن راكباً متى شئت وكابتناً متى أردت. تحكم مطلق بتجربتك.',
    accent: '#A78BFA',    // Violet
    glow: 'rgba(139,92,246,0.25)',
    perks: ['🔄 تبديل فوري', '💡 تحكم شامل'],
  },
];

const RoleSelectScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { updateUser } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pulse animation for selected card
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.02, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleContinue = async () => {
    if (!selected) return Alert.alert('', 'يرجى اختيار دورك أولاً لتهيئة واجهتك الخاصة');
    setLoading(true);
    try {
      await updateUser({ role: selected as any });
      // التوجيه المباشر للوحة التحكم حسب الدور
      if (selected === 'captain' || selected === 'both') {
        navigation.replace('CaptainApp');
      } else {
        navigation.replace('PassengerApp');
      }
    } catch {
      Alert.alert('عذراً', 'حدث خطأ في تحديث البيانات، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const activeRole = roles.find(r => r.id === selected);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Same 3D Background as Onboarding ── */}
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: Logo + Title ── */}
        <View style={styles.header}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>Khodni</Text>
            <Text style={styles.titleOrange}>Maak</Text>
          </View>
          <Text style={styles.mainTitle}>صمّم تجربتك 🎯</Text>
          <Text style={styles.mainDesc}>اختر دورك لنهيئ لك واجهة وميزات مخصصة بالكامل.</Text>
        </View>

        {/* ── Role Cards (Glass Style) ── */}
        <View style={styles.cardsGrid}>
          {roles.map((role) => {
            const isSelected = selected === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                onPress={() => setSelected(role.id)}
                activeOpacity={0.88}
              >
                <Animated.View style={[
                  styles.roleCard,
                  { borderColor: isSelected ? role.accent : 'rgba(255,255,255,0.15)' },
                  isSelected && { transform: [{ scale: pulse }] }
                ]}>
                  {/* Glow layer for selected */}
                  {isSelected && <View style={[styles.cardGlow, { backgroundColor: role.glow }]} />}
                  <View style={styles.glassCardHighlight} />

                  <View style={styles.cardHeader}>
                    <View style={[styles.iconWrap, { borderColor: isSelected ? role.accent : 'rgba(255,255,255,0.2)', backgroundColor: isSelected ? role.accent + '20' : 'rgba(255,255,255,0.08)' }]}>
                      <Ionicons name={role.iconName} size={26} color={isSelected ? role.accent : 'rgba(255,255,255,0.7)'} />
                    </View>
                    <View style={[styles.checkCircle, { borderColor: isSelected ? role.accent : 'rgba(255,255,255,0.3)', backgroundColor: isSelected ? role.accent : 'transparent' }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={[styles.roleTitle, { color: isSelected ? role.accent : '#FFFFFF' }]}>{role.title}</Text>
                    <Text style={styles.roleDesc}>{role.desc}</Text>
                    <View style={styles.perksRow}>
                      {role.perks.map((perk, i) => (
                        <View key={i} style={[styles.perkChip, { borderColor: isSelected ? role.accent + '50' : 'rgba(255,255,255,0.15)', backgroundColor: isSelected ? role.accent + '15' : 'rgba(255,255,255,0.06)' }]}>
                          <Text style={[styles.perkText, { color: isSelected ? role.accent : 'rgba(255,255,255,0.7)' }]}>{perk}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vision text inside cards section */}
        <View style={styles.visionWrap}>
          <Text style={styles.visionTitle}>رؤيتنا 🌟</Text>
          <Text style={styles.visionBody}>نبتكر لتسهيل يومك، رحلات ذكية وآمنة تواكب تطلعاتك.</Text>
        </View>
      </ScrollView>

      {/* ── Floating Confirm Button ── */}
      <View style={styles.footerWrap}>
        <TouchableOpacity
          style={[
            styles.mainBtn,
            !selected && styles.mainBtnDisabled,
            selected && { borderColor: activeRole?.accent }
          ]}
          onPress={handleContinue}
          disabled={!selected || loading}
          activeOpacity={0.88}
        >
          {selected && <Ionicons name="chevron-back" size={22} color={activeRole?.accent} />}
          <Text style={[styles.mainBtnText, { color: selected ? activeRole?.accent : 'rgba(255,255,255,0.4)' }]}>
            {loading ? 'جاري تهيئة مساحتك...' : (selected ? 'تأكيد ومتابعة الدخول' : 'يُرجى اختيار دورك')}
          </Text>
          {selected && <Ionicons name={activeRole!.iconName} size={20} color={activeRole?.accent} />}
        </TouchableOpacity>

        <Text style={styles.footerSig}>Made with 🤍 by Eng. Taha Al-Khatib</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1F3C' },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 56,
    paddingBottom: 180,
  },

  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 90, height: 90, marginBottom: -4 },
  titleRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  titleWhite: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  titleOrange: { fontSize: 32, fontWeight: '900', color: '#F97316', letterSpacing: 1 },
  mainTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  mainDesc: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, fontWeight: '600' },

  cardsGrid: { gap: 18, marginBottom: 24 },

  roleCard: {
    backgroundColor: 'rgba(20,25,45,0.55)',
    borderRadius: 28, padding: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 8 }
    })
  },
  cardGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  glassCardHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },

  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  cardBody: { alignItems: 'flex-end' },
  roleTitle: { fontSize: 20, fontWeight: '900', marginBottom: 6 },
  roleDesc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'right', lineHeight: 20, fontWeight: '600', marginBottom: 14 },
  perksRow: { flexDirection: 'row-reverse', gap: 8 },
  perkChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  perkText: { fontSize: 12, fontWeight: '800' },

  visionWrap: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20, alignItems: 'center' },
  visionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginBottom: 6 },
  visionBody: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 22, fontWeight: '600' },

  footerWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 16,
    backgroundColor: 'rgba(20,25,45,0.85)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', gap: 10,
  },
  mainBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22, height: 58, width: '100%',
    backgroundColor: 'transparent', gap: 10,
  },
  mainBtnDisabled: { borderColor: 'rgba(255,255,255,0.1)' },
  mainBtnText: { fontSize: 17, fontWeight: '900' },

  footerSig: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700' },
});

export default RoleSelectScreen;
