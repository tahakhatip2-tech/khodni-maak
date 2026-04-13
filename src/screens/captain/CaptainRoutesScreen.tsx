import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
  Alert, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { permanentRouteService, PermanentRoute } from '../../services/permanentRouteService';

// ── Brand Colors ──────────────────────────────────────
const TEAL        = '#0D9488';
const TEAL_LIGHT  = '#14B8A6';
const NAVY        = '#0F172A';
const NAVY_MID    = '#1E293B';
const PURPLE      = '#7C3AED';
const PURPLE_LIGHT = '#A78BFA';

const DAYS_AR: Record<string, string> = {
  sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء',
  wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت'
};

const SAMPLE_ROUTES = [
  { _id: 'sample1', name: 'خط إربد - عمان (جامعة التكنولوجيا)', description: 'مسار مخصص لطلاب الكليات والموظفين', startLocation: { address: 'إربد - البوابة الشمالية للجامعة' }, endLocation: { address: 'عمان - صويلح' }, departureTime: '06:30', daysOfWeek: ['sun','mon','tue','wed','thu'], seatsPerCaptain: 4, pricePerSeat: 3, currency: 'JOD', maxCaptains: 5, subscribedCaptains: [] },
  { _id: 'sample2', name: 'عمان - الزرقاء (مجمع الشرق)', description: 'نقل ترددي سريع بين المحافظتين', startLocation: { address: 'عمان - مجمع طبربور' }, endLocation: { address: 'الزرقاء - مجمع الشرق' }, departureTime: '08:00', daysOfWeek: ['sun','mon','tue','wed','thu','sat'], seatsPerCaptain: 4, pricePerSeat: 1.5, currency: 'JOD', maxCaptains: 10, subscribedCaptains: [] },
];

const CaptainRoutesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<PermanentRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'subscribed'>('available');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [])
  );

  const fetchRoutes = async () => {
    try {
      const res = await permanentRouteService.getRoutes('active');
      setRoutes(res.data.data || []);
    } catch (err) {
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isSubscribed = (route: PermanentRoute): boolean => {
    return route.subscribedCaptains.some(
      (s) => s.captain._id === (user as any)?._id && s.status === 'active'
    );
  };

  const handleSubscribe = async (route: PermanentRoute) => {
    if (isSubscribed(route)) {
      Alert.alert(
        'إلغاء الاشتراك',
        `هل تريد إلغاء اشتراكك في مسار "${route.name}"؟`,
        [
          { text: 'تراجع', style: 'cancel' },
          {
            text: 'إلغاء الاشتراك',
            style: 'destructive',
            onPress: async () => {
              setSubscribing(route._id);
              try {
                await permanentRouteService.unsubscribeFromRoute(route._id);
                await fetchRoutes();
              } catch (err: any) {
                Alert.alert('خطأ', err.response?.data?.message || 'فشل إلغاء الاشتراك');
              } finally {
                setSubscribing(null);
              }
            }
          }
        ]
      );
    } else {
      setSubscribing(route._id);
      try {
        await permanentRouteService.subscribeToRoute(route._id);
        await fetchRoutes();
        Alert.alert('✅ تم الاشتراك', `أنت الآن مشترك في مسار "${route.name}".\nستصلك طلبات الحجز تلقائياً.`);
      } catch (err: any) {
        Alert.alert('خطأ', err.response?.data?.message || 'فشل الاشتراك');
      } finally {
        setSubscribing(null);
      }
    }
  };

  const filteredRoutes = routes.filter(route =>
    activeTab === 'subscribed' ? isSubscribed(route) : !isSubscribed(route)
  );

  const activeCaptainsCount = (route: PermanentRoute) =>
    route.subscribedCaptains.filter(s => s.status === 'active').length;

  const formatDays = (days: string[]) =>
    days.map(d => DAYS_AR[d] || d).join(' • ');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={[NAVY, '#0F1A2E', NAVY]} style={StyleSheet.absoluteFillObject} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(13,148,136,0.18)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerTop}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="bus" size={26} color={TEAL_LIGHT} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>المسارات الدائمة</Text>
            <Text style={styles.headerSubtitle}>اشترك في مسار وابدأ باستقبال الحجوزات</Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{routes.length}</Text>
            <Text style={styles.statLbl}>مسار متاح</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{routes.filter(r => isSubscribed(r)).length}</Text>
            <Text style={styles.statLbl}>اشتراكاتي</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>نشط</Text>
            <Text style={styles.statLbl}>الحالة</Text>
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabsRow}>
        {(['available', 'subscribed'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab === 'subscribed' ? 'checkmark-circle' : 'grid-outline'}
              size={16}
              color={activeTab === tab ? TEAL_LIGHT : 'rgba(255,255,255,0.4)'}
            />
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
              {tab === 'available' ? 'متاحة للاشتراك' : 'مشترك فيها'}
            </Text>
            {tab === 'subscribed' && routes.filter(r => isSubscribed(r)).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeTxt}>{routes.filter(r => isSubscribed(r)).length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchRoutes(); }}
            tintColor={TEAL_LIGHT}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={TEAL_LIGHT} style={{ marginTop: 60 }} />
        ) : filteredRoutes.length === 0 ? (
          <View>
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name={activeTab === 'subscribed' ? 'bus-outline' : 'map-outline'} size={52} color={TEAL_LIGHT} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'subscribed' ? 'لم تشترك في أي مسار بعد' : 'لا توجد مسارات متاحة حالياً'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'subscribed'
                  ? 'اذهب إلى "متاحة" واشترك في مسار لبدء استقبال الحجوزات، أو تفقد المسارات المقترحة أسفله.'
                  : 'تعمل الإدارة على تخطيط مسارات جديدة، اطلع على المعاينة بالأسفل!'
                }
              </Text>
            </View>

            {/* Premium Sample Data Presentation */}
            {activeTab === 'available' && (
              <View style={{ marginTop: 30 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Ionicons name="sparkles" size={18} color="#F59E0B" />
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>مسارات مقترحة تجريبية</Text>
                </View>
                {SAMPLE_ROUTES.map(route => (
                   <View key={route._id} style={[styles.routeCard, { borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.02)' }]}>
                     <View style={[styles.glassHighlight, { backgroundColor: 'rgba(245,158,11,0.05)' }]} />
                     
                     {/* Demo Badge */}
                     <View style={[styles.subscribedBadge, { backgroundColor: '#F59E0B' }]}>
                       <Text style={styles.subscribedBadgeTxt}>معاينة فقط</Text>
                     </View>

                     <View style={[styles.cardHeader, { marginTop: 15 }]}>
                       <View style={[styles.routeIconWrap, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                         <Ionicons name="bus" size={24} color="#F59E0B" />
                       </View>
                       <View style={{ flex: 1, marginRight: 12 }}>
                         <Text style={styles.routeName}>{route.name}</Text>
                         <Text style={styles.routeDesc} numberOfLines={1}>{route.description}</Text>
                       </View>
                       <View style={styles.priceWrap}>
                         <Text style={[styles.priceNum, { color: '#F59E0B' }]}>{route.pricePerSeat}</Text>
                         <Text style={styles.priceCur}>{route.currency}/مقعد</Text>
                       </View>
                     </View>

                     <View style={styles.routeLine}>
                       <View style={styles.routePoint}>
                         <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                         <Text style={styles.routeAddr} numberOfLines={1}>{route.startLocation.address}</Text>
                       </View>
                       <View style={styles.routeConnector}>
                         <View style={styles.routeConnectorLine} />
                         <Ionicons name="arrow-down" size={14} color="rgba(255,255,255,0.25)" />
                       </View>
                       <View style={styles.routePoint}>
                         <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                         <Text style={styles.routeAddr} numberOfLines={1}>{route.endLocation.address}</Text>
                       </View>
                     </View>

                     <View style={styles.pillsRow}>
                       <View style={[styles.pill, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                         <Ionicons name="time" size={13} color="#F59E0B" />
                         <Text style={styles.pillTxt}>{route.departureTime}</Text>
                       </View>
                       <View style={[styles.pill, { borderColor: 'rgba(245,158,11,0.3)' }]}>
                         <Ionicons name="calendar" size={13} color="#F59E0B" />
                         <Text style={styles.pillTxt} numberOfLines={1}>{formatDays(route.daysOfWeek)}</Text>
                       </View>
                     </View>
                   </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          filteredRoutes.map(route => {
            const subscribed = isSubscribed(route);
            const captainsCount = activeCaptainsCount(route);
            const isFull = captainsCount >= route.maxCaptains && !subscribed;
            const isLoading = subscribing === route._id;

            return (
              <View key={route._id} style={[styles.routeCard, subscribed && styles.routeCardSubscribed]}>
                {/* Glass highlight */}
                <View style={styles.glassHighlight} />

                {/* Subscribed Badge */}
                {subscribed && (
                  <View style={styles.subscribedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#FFF" />
                    <Text style={styles.subscribedBadgeTxt}>مشترك</Text>
                  </View>
                )}

                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.routeIconWrap}>
                    <Ionicons name="bus" size={24} color={subscribed ? TEAL_LIGHT : PURPLE_LIGHT} />
                  </View>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    {route.description && (
                      <Text style={styles.routeDesc} numberOfLines={1}>{route.description}</Text>
                    )}
                  </View>
                  <View style={styles.priceWrap}>
                    <Text style={styles.priceNum}>{route.pricePerSeat}</Text>
                    <Text style={styles.priceCur}>{route.currency}/مقعد</Text>
                  </View>
                </View>

                {/* Route Line */}
                <View style={styles.routeLine}>
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{route.startLocation.address}</Text>
                  </View>
                  <View style={styles.routeConnector}>
                    <View style={styles.routeConnectorLine} />
                    <Ionicons name="arrow-down" size={14} color="rgba(255,255,255,0.25)" />
                  </View>
                  <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: '#F97316' }]} />
                    <Text style={styles.routeAddr} numberOfLines={1}>{route.endLocation.address}</Text>
                  </View>
                </View>

                {/* Info Pills */}
                <View style={styles.pillsRow}>
                  <View style={styles.pill}>
                    <Ionicons name="time-outline" size={13} color={TEAL_LIGHT} />
                    <Text style={styles.pillTxt}>{route.departureTime}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Ionicons name="calendar-outline" size={13} color={TEAL_LIGHT} />
                    <Text style={styles.pillTxt} numberOfLines={1}>{formatDays(route.daysOfWeek)}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Ionicons name="person-outline" size={13} color={TEAL_LIGHT} />
                    <Text style={styles.pillTxt}>{route.seatsPerCaptain} مقاعد</Text>
                  </View>
                </View>

                {/* Captains count */}
                <View style={styles.captainsRow}>
                  <View style={styles.captainsCountWrap}>
                    {route.subscribedCaptains.filter(s => s.status === 'active').slice(0, 3).map((sub, idx) => (
                      <View key={idx} style={[styles.captainAvatar, { right: idx * 18 }]}>
                        <Text style={styles.captainAvatarTxt}>{sub.captain.name.charAt(0)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.captainsLabel}>
                    {captainsCount}/{route.maxCaptains} كابتن مشترك
                  </Text>
                </View>

                {/* Subscribe Button */}
                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    subscribed && styles.subscribeBtnActive,
                    isFull && styles.subscribeBtnFull,
                  ]}
                  onPress={() => handleSubscribe(route)}
                  disabled={isFull || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={subscribed ? 'checkmark-circle' : isFull ? 'close-circle' : 'add-circle-outline'}
                        size={20}
                        color="#FFF"
                      />
                      <Text style={styles.subscribeBtnTxt}>
                        {subscribed ? 'مشترك — اضغط للإلغاء' : isFull ? 'اكتمل العدد' : 'اشترك الآن'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* View Bookings Button — only for subscribed routes */}
                {subscribed && (
                  <TouchableOpacity
                    style={styles.bookingsBtn}
                    onPress={() => navigation.navigate('RouteBookings', { routeId: route._id, routeName: route.name })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people" size={18} color={TEAL_LIGHT} />
                    <Text style={styles.bookingsBtnTxt}>عرض حجوزات المسار</Text>
                    <Ionicons name="arrow-back" size={16} color={TEAL_LIGHT} />
                  </TouchableOpacity>
                )}
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
  headerIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(13,148,136,0.2)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 14,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 3 },

  statsBar: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: TEAL_LIGHT, fontSize: 20, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  tabsRow: {
    flexDirection: 'row-reverse',
    marginHorizontal: 20, marginTop: 20, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  tabBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  tabBtnActive: { backgroundColor: 'rgba(13,148,136,0.2)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)' },
  tabTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
  tabTxtActive: { color: TEAL_LIGHT },
  tabBadge: { backgroundColor: TEAL, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 },

  routeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16, overflow: 'hidden', position: 'relative',
  },
  routeCardSubscribed: {
    borderColor: 'rgba(13,148,136,0.4)',
    backgroundColor: 'rgba(13,148,136,0.06)',
  },
  glassHighlight: {
    position: 'absolute', top: 0, left: '10%', right: '10%',
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  subscribedBadge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: TEAL, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  subscribedBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  cardHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 14 },
  routeIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  routeName: { color: '#FFF', fontSize: 16, fontWeight: '900', textAlign: 'right' },
  routeDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 2 },
  priceWrap: { alignItems: 'flex-start' },
  priceNum: { color: TEAL_LIGHT, fontSize: 22, fontWeight: '900' },
  priceCur: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },

  routeLine: { marginBottom: 14, paddingHorizontal: 4 },
  routePoint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeAddr: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  routeConnector: { alignItems: 'flex-end', paddingRight: 4, marginVertical: 4 },
  routeConnectorLine: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 2, marginRight: 5 },

  pillsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(13,148,136,0.2)',
  },
  pillTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' },

  captainsRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  captainsCountWrap: { flexDirection: 'row-reverse', position: 'relative', height: 28, width: 80 },
  captainAvatar: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(124,58,237,0.3)',
    borderWidth: 2, borderColor: NAVY_MID,
    alignItems: 'center', justifyContent: 'center',
  },
  captainAvatarTxt: { color: PURPLE_LIGHT, fontSize: 11, fontWeight: '900' },
  captainsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },

  subscribeBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 16,
    backgroundColor: PURPLE,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  subscribeBtnActive: {
    backgroundColor: 'rgba(13,148,136,0.25)',
    borderColor: TEAL,
  },
  subscribeBtnFull: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  subscribeBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  bookingsBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 46, borderRadius: 14, marginTop: 10,
    backgroundColor: 'rgba(13,148,136,0.12)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.35)',
  },
  bookingsBtnTxt: { color: TEAL_LIGHT, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'center' },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 60,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
  },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(13,148,136,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600',
    textAlign: 'center', marginTop: 8, paddingHorizontal: 30,
  },
});

export default CaptainRoutesScreen;
