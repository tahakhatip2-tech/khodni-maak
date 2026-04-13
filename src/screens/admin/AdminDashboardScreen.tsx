import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { permanentRouteService, PermanentRoute } from '../../services/permanentRouteService';
import { useAuth } from '../../context/AuthContext';

const NAVY     = '#0F172A';
const VIOLET   = '#6D28D9';
const VIOLET_L = '#8B5CF6';
const AMBER    = '#F59E0B';
const RED      = '#EF4444';
const GREEN    = '#10B981';

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  active:   { label: 'نشط',    color: GREEN,    icon: 'checkmark-circle' },
  paused:   { label: 'متوقف',  color: AMBER,    icon: 'pause-circle' },
  archived: { label: 'مؤرشف', color: '#64748B', icon: 'archive' },
};

const DAYS_AR: Record<string, string> = {
  sun: 'أح', mon: 'اث', tue: 'ث', wed: 'أر', thu: 'خ', fri: 'ج', sat: 'س'
};

const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { logout } = useAuth();
  const [routes, setRoutes] = useState<PermanentRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, archived: 0 });

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const fetchData = async () => {
    try {
      // جلب جميع المسارات بغض النظر عن الحالة
      const [activeRes, pausedRes, archivedRes] = await Promise.all([
        permanentRouteService.getRoutes('active'),
        permanentRouteService.getRoutes('paused'),
        permanentRouteService.getRoutes('archived'),
      ]);
      const all = [
        ...(activeRes.data.data || []),
        ...(pausedRes.data.data || []),
        ...(archivedRes.data.data || []),
      ];
      setRoutes(all);
      setStats({
        total: all.length,
        active: (activeRes.data.data || []).length,
        paused: (pausedRes.data.data || []).length,
        archived: (archivedRes.data.data || []).length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = (route: PermanentRoute) => {
    const options = (['active', 'paused', 'archived'] as const)
      .filter(s => s !== route.status)
      .map(s => ({
        text: STATUS_INFO[s].label,
        onPress: async () => {
          try {
            await permanentRouteService.updateRouteStatus(route._id, s);
            await fetchData();
          } catch (err: any) {
            Alert.alert('خطأ', err.response?.data?.message || 'فشل تغيير الحالة');
          }
        }
      }));

    Alert.alert(
      `تغيير حالة "${route.name}"`,
      `الحالة الحالية: ${STATUS_INFO[route.status].label}`,
      [...options, { text: 'إلغاء', style: 'cancel' as const }]
    );
  };

  const StatCard = ({ num, label, color }: { num: number; label: string; color: string }) => (
    <View style={[styles.statCard, { borderColor: color + '40' }]}>
      <Text style={[styles.statNum, { color }]}>{num}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={[NAVY, '#110D2E', NAVY]} style={StyleSheet.absoluteFillObject} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(109,40,217,0.2)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreatePermanentRoute')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>لوحة الأدمن</Text>
            <Text style={styles.headerSub}>إدارة المسارات الدائمة</Text>
          </View>
          <TouchableOpacity 
            style={[styles.adminBadge, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}
            onPress={() => {
              Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج من لوحة الأدمن؟', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'تسجيل الخروج', style: 'destructive', onPress: logout }
              ]);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard num={stats.active}   label="نشط"    color={GREEN}    />
          <StatCard num={stats.paused}   label="متوقف"  color={AMBER}    />
          <StatCard num={stats.archived} label="مؤرشف"  color="#64748B"  />
          <StatCard num={stats.total}    label="الكل"   color={VIOLET_L} />
        </View>
      </View>

      {/* ── Routes List ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={VIOLET_L} />
        }
      >
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>المسارات الدائمة ({routes.length})</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreatePermanentRoute')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color={VIOLET_L} />
            <Text style={styles.createBtnTxt}>مسار جديد</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={VIOLET_L} style={{ marginTop: 60 }} />
        ) : routes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bus-outline" size={52} color={VIOLET_L} />
            <Text style={styles.emptyTitle}>لا توجد مسارات بعد</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('CreatePermanentRoute')}>
              <Text style={styles.emptyAddTxt}>+ أنشئ أول مسار</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map(route => {
            const si = STATUS_INFO[route.status];
            const activeCaptains = route.subscribedCaptains.filter(s => s.status === 'active').length;

            return (
              <View key={route._id} style={styles.routeCard}>
                <View style={styles.glassTop} />

                {/* Top row */}
                <View style={styles.cardTopRow}>
                  <TouchableOpacity
                    style={[styles.statusPill, { backgroundColor: si.color + '22', borderColor: si.color + '60' }]}
                    onPress={() => handleStatusChange(route)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={si.icon as any} size={13} color={si.color} />
                    <Text style={[styles.statusPillTxt, { color: si.color }]}>{si.label}</Text>
                  </TouchableOpacity>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('CreatePermanentRoute', { route })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={18} color={VIOLET_L} />
                  </TouchableOpacity>
                </View>

                {/* Route */}
                <View style={styles.routeLineRow}>
                  <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: GREEN }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{route.startLocation.address}</Text>
                  </View>
                  <Ionicons name="arrow-back" size={14} color="rgba(255,255,255,0.25)" style={{ marginVertical: 4, alignSelf: 'flex-end', marginRight: 12 }} />
                  <View style={styles.routePoint}>
                    <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{route.endLocation.address}</Text>
                  </View>
                </View>

                {/* Info row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoPill}>
                    <Ionicons name="time-outline" size={12} color={VIOLET_L} />
                    <Text style={styles.infoPillTxt}>{route.departureTime}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Ionicons name="people-outline" size={12} color={VIOLET_L} />
                    <Text style={styles.infoPillTxt}>{activeCaptains}/{route.maxCaptains} كابتن</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Ionicons name="pricetag-outline" size={12} color={VIOLET_L} />
                    <Text style={styles.infoPillTxt}>{route.pricePerSeat} {route.currency}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Ionicons name="calendar-outline" size={12} color={VIOLET_L} />
                    <Text style={styles.infoPillTxt}>{route.daysOfWeek.map(d => DAYS_AR[d]).join(' ')}</Text>
                  </View>
                </View>

                {/* Capacity Bar */}
                <View style={styles.capacityWrap}>
                  <View style={styles.capacityBar}>
                    <View style={[styles.capacityFill, {
                      width: `${Math.min((activeCaptains / route.maxCaptains) * 100, 100)}%` as any,
                      backgroundColor: activeCaptains >= route.maxCaptains ? RED : VIOLET_L
                    }]} />
                  </View>
                  <Text style={styles.capacityTxt}>
                    {activeCaptains >= route.maxCaptains ? 'اكتمل الكباتن' : `${route.maxCaptains - activeCaptains} مقاعد كابتن شاغرة`}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  header: {
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20, gap: 12 },
  adminBadge: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(109,40,217,0.2)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1,
  },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 3 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },

  listHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  createBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(109,40,217,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: VIOLET_L + '50' },
  createBtnTxt: { color: VIOLET_L, fontSize: 13, fontWeight: '800' },

  routeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 14, position: 'relative',
  },
  glassTop: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  cardTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  routeName: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '900', textAlign: 'right' },
  statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusPillTxt: { fontSize: 11, fontWeight: '800' },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },

  routeLineRow: { marginBottom: 12, paddingRight: 4 },
  routePoint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  routeAddr: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', textAlign: 'right' },

  infoRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  infoPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(109,40,217,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(109,40,217,0.25)',
  },
  infoPillTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700' },

  capacityWrap: { gap: 6 },
  capacityBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: 2 },
  capacityTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', textAlign: 'right' },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  emptyAddBtn: { backgroundColor: VIOLET, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyAddTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});

export default AdminDashboardScreen;
