import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, StatusBar, ImageBackground, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { bookingService } from '../../services/bookingService';
import { tripService } from '../../services/tripService';
import { userService } from '../../services/userService';

// --- Centralized Ultra Premium Theme ---
const PREMIUM_THEME = {
  passenger: {
    primary: '#F97316', // Orange
    accent: '#FB923C',
    glow: 'rgba(249, 115, 22, 0.4)'
  },
  captain: {
    primary: '#14B8A6', // Teal
    accent: '#0D9488',
    glow: 'rgba(20, 184, 166, 0.4)'
  },
  both: {
    primary: '#8B5CF6', // Violet
    accent: '#7C3AED',
    glow: 'rgba(139, 92, 246, 0.4)'
  }
};

const ProfileScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user, logout, refreshUser } = useAuth();

  // Determine active theme based on user primary role
  const roleKey = (user?.role || 'passenger') as keyof typeof PREMIUM_THEME;
  const activeTheme = PREMIUM_THEME[roleKey] || PREMIUM_THEME.passenger;

  const [actualTotalTrips, setActualTotalTrips] = React.useState(user?.totalTrips || 0);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const fetchStats = async () => {
        try {
          if (roleKey === 'captain') {
            const res = await tripService.getCaptainTrips();
            const completed = res.data.data.filter((t: any) => t.status === 'completed');
            setActualTotalTrips(completed.length);
          } else {
            const res = await bookingService.getMyBookings({ status: 'completed' });
            setActualTotalTrips(res.data.data.length || 0);
          }
        } catch (e) {}
      };
      fetchStats();
    }, [roleKey])
  );

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من رغبتك بالخروج من حسابك؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'تأكيد الخروج', style: 'destructive', onPress: logout },
    ]);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('صلاحيات مفقودة', 'نحن بحاجة إلى إذن للوصول إلى معرض الصور الخاص بك لتحديث صورتك الشخصية.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        try {
          const res = await userService.uploadAvatar(imageUri);
          await refreshUser();
          Alert.alert('نجاح', 'تم تحديث صورتك الشخصية بنجاح.');
        } catch (err: any) {
          Alert.alert('خطأ', 'تعذر رفع الصورة، تأكد من اتصالك وجرب مجدداً.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (e) {
       setUploadingImage(false);
       Alert.alert('خطأ', 'حدث خطأ غير متوقع.');
    }
  };

  const menuItems = [
    { icon: 'location' as const, label: 'العناوين المحفوظة', color: activeTheme.primary, onPress: () => navigation.navigate('SavedAddresses') },
    { icon: 'notifications' as const, label: 'الإشعارات المفضلة', color: '#F59E0B', onPress: () => navigation.navigate('Notifications') },
    { icon: 'sync-circle' as const, label: 'تغيير أو تحديث الدور', color: '#10B981', onPress: () => navigation.navigate('RoleSelect') },
    { icon: 'shield-checkmark' as const, label: 'الحماية والأمان', color: '#8B5CF6', onPress: () => {} },
    { icon: 'chatbubbles' as const, label: 'الدعم الفني والشكاوى', color: '#3B82F6', onPress: () => {} },
  ];

  const getRoleText = (role: string | undefined) => {
    switch(role) {
      case 'captain': return 'مُضيف مركبة';
      case 'both': return 'حساب مزدوج';
      default: return 'راكب حساب أساسي';
    }
  };

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
          colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.98)', '#0F172A']}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      {/* Floating Theme Glow Effect Behind Profile */}
      <View style={[styles.bgOrbTop, { backgroundColor: activeTheme.glow }]} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ── Profile Header (Avatar & Context) ── */}
        <View style={styles.profileBox}>
          <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.9} onPress={handlePickImage} disabled={uploadingImage}>
            <View style={[styles.avatarGlow, { backgroundColor: activeTheme.glow, opacity: 0.6 }]} />
            <View style={[styles.avatar, { borderColor: activeTheme.primary, overflow: 'hidden' }]}>
               {user?.avatar && !user.avatar.includes('default') ? (
                 <ImageBackground 
                   source={{ uri: user.avatar.startsWith('http') ? user.avatar : `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.42.208:5000'}${user.avatar}` }} 
                   style={{ width: '100%', height: '100%' }} 
                 />
               ) : (
                 <Text style={[styles.avatarTxt, { color: activeTheme.primary }]}>{user?.name?.charAt(0) || '👤'}</Text>
               )}
               {uploadingImage && (
                 <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={activeTheme.primary} size="large" />
                 </View>
               )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#0F172A" />
            </View>
          </TouchableOpacity>
          <Text style={styles.nameTxt}>{user?.name || 'مستخدم'}</Text>
          <Text style={styles.phoneTxt}>{user?.phone || '...'}</Text>
          
          <View style={[styles.rolePill, { borderColor: activeTheme.primary, backgroundColor: activeTheme.glow.replace('0.4', '0.15') }]}>
             <Ionicons name={roleKey === 'captain' ? 'car-sport' : roleKey === 'both' ? 'flash' : 'person'} size={14} color={activeTheme.primary} style={{marginLeft: 6}} />
             <Text style={[styles.rolePillTxt, { color: activeTheme.primary }]}>{getRoleText(user?.role)}</Text>
          </View>
        </View>

        {/* ── Beautiful Stats Deck ── */}
        <View style={styles.statsCard}>
          <View style={styles.glassHighlight} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
               <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statVal, { color: '#F59E0B' }]}>{Number((user?.rating as any)?.average ?? user?.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.statLbl}>التقييم العام</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: activeTheme.glow.replace('0.4','0.15') }]}>
               <Ionicons name="car" size={24} color={activeTheme.primary} />
            </View>
            <Text style={[styles.statVal, { color: activeTheme.primary }]}>{actualTotalTrips}</Text>
            <Text style={styles.statLbl}>الرحلات</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
               <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statVal, { color: '#10B981' }]}>موثّق</Text>
            <Text style={styles.statLbl}>الموثوقية</Text>
          </View>
        </View>

        {/* ── Captain Vehicle Info (If exists) ── */}
        {user?.vehicle && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeader, { color: activeTheme.primary }]}>تفاصيل المركبة المسجلة 👇</Text>
            <View style={[styles.vehicleCard, { borderColor: activeTheme.glow.replace('0.4','0.2') }]}>
               <View style={styles.glassHighlight} />
               <View style={[styles.vehicleIconBox, { backgroundColor: activeTheme.glow.replace('0.4','0.2') }]}>
                 <Ionicons name="car-sport" size={32} color={activeTheme.primary} />
               </View>
               <View style={styles.vehicleInfo}>
                 <Text style={styles.vehicleTitle}>{user.vehicle.model}</Text>
                 <Text style={styles.vehicleSubtitle}>{user.vehicle.color} • لوحة: {user.vehicle.plateNumber}</Text>
               </View>
            </View>
          </View>
        )}

        {/* ── Dynamic Main Menu Settings ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeader, { color: activeTheme.primary }]}>إعدادات التطبيق ⚙️</Text>
          <View style={styles.menuContainer}>
            <View style={styles.glassHighlight} />
            {menuItems.map((item, i) => {
              // Hide RoleSelect if user hasn't chosen BOTH, to not confuse them
              if (item.label.includes('الدور') && user?.role !== 'both') return null;

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.3)" />
                  <View style={styles.menuTextCol}>
                    <Text style={styles.menuItemLbl}>{item.label}</Text>
                  </View>
                  <View style={[styles.menuIconBox, { backgroundColor: item.color + '25' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Danger Zone (Logout) ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
           <Ionicons name="log-out-outline" size={24} color="#EF4444" style={{marginLeft: 8}} />
           <Text style={styles.logoutBtnTxt}>تسجيل الخروج من الحساب</Text>
        </TouchableOpacity>

        <Text style={styles.versionTxt}>الإصدار 1.0.0 (BETA) - KhodniMaak</Text>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  bgOrbTop: { position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: 150, opacity: 0.15 },

  content: { paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingHorizontal: 24, paddingBottom: 120 },

  // Profile Info Header
  profileBox: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatarGlow: { position: 'absolute', top: -12, left: -12, right: -12, bottom: -12, borderRadius: 70, filter: [{ blur: 20 }] },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(15,23,42,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12 },
  avatarTxt: { fontSize: 44, fontWeight: '900' },
  editBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#FFFFFF', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  nameTxt: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
  phoneTxt: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: 14, letterSpacing: 1 },
  rolePill: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  rolePillTxt: { fontSize: 13, fontWeight: '900' },

  // Stats Card Deck
  statsCard: {
    flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 28,
    paddingVertical: 20, paddingHorizontal: 16, marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden'
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  statItem: { flex: 1, alignItems: 'center', gap: 8 },
  statIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '800' },
  statDivider: { width: 1, height: '70%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

  // Sections
  sectionBlock: { marginBottom: 32 },
  sectionHeader: { fontSize: 15, fontWeight: '900', textAlign: 'right', marginBottom: 16, paddingHorizontal: 4 },

  vehicleCard: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24, padding: 16, borderWidth: 1, overflow: 'hidden'
  },
  vehicleIconBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  vehicleInfo: { flex: 1, alignItems: 'flex-end' },
  vehicleTitle: { fontSize: 18, color: '#FFFFFF', fontWeight: '900', marginBottom: 6 },
  vehicleSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },

  menuContainer: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  menuItem: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  menuIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  menuTextCol: { flex: 1, alignItems: 'flex-end' },
  menuItemLbl: { fontSize: 15, fontWeight: '800', color: '#E2E8F0' },

  logoutBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 24, paddingVertical: 18, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.4)',
    marginBottom: 32
  },
  logoutBtnTxt: { color: '#EF4444', fontSize: 15, fontWeight: '900' },

  versionTxt: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '800' }
});

export default ProfileScreen;
