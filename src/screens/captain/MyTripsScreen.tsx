import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform, StatusBar, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

const { width } = Dimensions.get('window');

const TEAL_DARK  = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const BG_DARK    = '#0F172A';

// ── Status Config ────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  scheduled: { label: 'مجدولة',    color: '#60A5FA', bg: 'rgba(96,165,250,0.15)',  icon: 'calendar-outline' },
  active:    { label: 'نشطة الآن', color: '#34D399', bg: 'rgba(52,211,153,0.15)',  icon: 'radio-button-on' },
  completed: { label: 'مكتملة',    color: '#94A3B8', bg: 'rgba(148,163,184,0.15)', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'ملغاة',     color: '#F87171', bg: 'rgba(248,113,113,0.15)', icon: 'close-circle-outline' },
};

// ── Filter Tabs ────────────────────────────────
const FILTERS = [
  { id: 'all',       label: 'الكل',    icon: 'list-outline' },
  { id: 'active',    label: 'نشطة',    icon: 'radio-button-on' },
  { id: 'scheduled', label: 'مجدولة',  icon: 'calendar-outline' },
  { id: 'completed', label: 'مكتملة',  icon: 'checkmark-done-outline' },
  { id: 'cancelled', label: 'ملغاة',   icon: 'close-circle-outline' },
];

const MyTripsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [trips, setTrips]           = useState<Trip[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('all');

  useFocusEffect(useCallback(() => { loadTrips(); }, [filter]));

  const loadTrips = async () => {
    try {
      const res = await tripService.getCaptainTrips(filter === 'all' ? undefined : filter);
      setTrips(res.data.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const handleCancel = (trip: Trip) => {
    Alert.alert(
      'إلغاء الرحلة',
      'هل أنت متأكد من إلغاء هذه الرحلة؟ سيتم إشعار جميع الركاب المحجوزين.',
      [
        { text: 'تراجع', style: 'cancel' },
        {
          text: 'نعم، إلغاء', style: 'destructive',
          onPress: async () => {
            try { await tripService.cancelTrip(trip._id); loadTrips(); }
            catch { Alert.alert('خطأ', 'تعذّر الإلغاء، يرجى المحاولة لاحقاً.'); }
          }
        }
      ]
    );
  };

  // Stats Summary
  const totalTrips     = trips.length;
  const activeTrips    = trips.filter(t => t.status === 'active').length;
  const totalPassengers = trips.reduce((sum, t) => sum + (t.bookedSeats || 0), 0);
  const totalEarnings   = trips
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.pricePerSeat * (t.bookedSeats || 0)), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Ambient Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['#0F172A', '#0F2027', '#0F172A']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>

      {/* ── App Bar ── */}
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>رحلاتي</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateTrip')}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnTxt}>جديدة</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Bar ── */}
      <View style={styles.statsRow}>
        {[
          { label: 'رحلاتي', val: totalTrips,      icon: 'car-sport',   color: TEAL_LIGHT },
          { label: 'نشطة',   val: activeTrips,     icon: 'pulse',       color: '#34D399' },
          { label: 'ركاب',   val: totalPassengers, icon: 'people',      color: '#60A5FA' },
          { label: 'أرباح',  val: `${totalEarnings.toFixed(0)} JD`, icon: 'cash', color: '#FBBF24' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={18} color={s.color} />
            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersWrap}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipActive]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={f.icon as any}
              size={13}
              color={filter === f.id ? '#FFF' : 'rgba(255,255,255,0.5)'}
            />
            <Text style={[styles.chipTxt, filter === f.id && styles.chipTxtActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL_LIGHT} />
          <Text style={styles.loadingTxt}>جاري تحميل رحلاتك...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadTrips(); }}
              tintColor={TEAL_LIGHT}
            />
          }
        >
          {trips.length === 0 ? (
            /* ── Empty State ── */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="map-outline" size={48} color={TEAL_LIGHT} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد رحلات بعد</Text>
              <Text style={styles.emptySub}>
                انشر رحلتك الأولى لتبدأ باستقبال الركاب وتحقيق الدخل اليومي.
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => navigation.navigate('CreateTrip')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.emptyCtaTxt}>إنشاء رحلة جديدة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            trips.map(trip => {
              const sc  = STATUS_MAP[trip.status] ?? STATUS_MAP.scheduled;
              const dept = new Date(trip.departureTime);
              const occupancy = trip.availableSeats > 0
                ? Math.round((trip.bookedSeats / trip.availableSeats) * 100)
                : 0;

              return (
                <TouchableOpacity
                  key={trip._id}
                  style={styles.card}
                  onPress={() => navigation.navigate('TripManagement', { tripId: trip._id })}
                  activeOpacity={0.88}
                >
                  {/* ── Card Top ── */}
                  <View style={styles.cardTop}>
                    <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                      <Ionicons name={sc.icon as any} size={12} color={sc.color} />
                      <Text style={[styles.statusTxt, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                    <View style={styles.dateTimeBox}>
                      <Text style={styles.dateStr}>
                        {dept.toLocaleDateString('ar', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Text>
                      <View style={styles.timePill}>
                        <Ionicons name="time-outline" size={11} color={TEAL_LIGHT} />
                        <Text style={styles.timePillTxt}>
                          {dept.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ── Route ── */}
                  <View style={styles.route}>
                    <View style={styles.routeRow}>
                      <Text style={styles.routeAddr} numberOfLines={1}>{trip.startLocation?.address || '—'}</Text>
                      <View style={[styles.routeDot, { backgroundColor: '#34D399' }]} />
                    </View>
                    <View style={styles.routeConnector}>
                      <View style={styles.routeLine} />
                    </View>
                    <View style={styles.routeRow}>
                      <Text style={styles.routeAddr} numberOfLines={1}>{trip.endLocation?.address || '—'}</Text>
                      <View style={[styles.routeDot, { backgroundColor: '#F87171' }]} />
                    </View>
                  </View>

                  {/* ── Dashed Divider (Ticket Style) ── */}
                  <View style={styles.divider}>
                    <View style={styles.dividerHole} />
                    <View style={styles.dividerDash} />
                    <View style={styles.dividerHole} />
                  </View>

                  {/* ── Card Bottom ── */}
                  <View style={styles.cardBot}>
                    {/* Occupancy Bar */}
                    <View style={styles.occupancyWrap}>
                      <View style={styles.occupancyBar}>
                        <View style={[
                          styles.occupancyFill,
                          { width: `${occupancy}%` as any, backgroundColor: occupancy > 80 ? '#34D399' : TEAL_LIGHT }
                        ]} />
                      </View>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="people" size={13} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.occupancyTxt}>{trip.bookedSeats}/{trip.availableSeats}</Text>
                      </View>
                    </View>

                    {/* Meta Info */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaChip}>
                        <Ionicons name="cash-outline" size={12} color="#FBBF24" />
                        <Text style={[styles.metaTxt, { color: '#FBBF24' }]}>{trip.pricePerSeat} JD</Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Ionicons name="resize-outline" size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.metaTxt}>{trip.distance?.toFixed(1) ?? '—'} كم</Text>
                      </View>
                      {trip.recurring?.enabled && (
                        <View style={styles.metaChip}>
                          <Ionicons name="repeat" size={12} color={TEAL_LIGHT} />
                          <Text style={[styles.metaTxt, { color: TEAL_LIGHT }]}>
                            {trip.recurring.days?.length ?? 0} أيام
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      {trip.status === 'scheduled' && (
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => handleCancel(trip)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle-outline" size={14} color="#F87171" />
                          <Text style={styles.cancelBtnTxt}>إلغاء</Text>
                        </TouchableOpacity>
                      )}
                      {trip.status === 'active' && (
                        <TouchableOpacity
                          style={styles.liveBtn}
                          onPress={() => navigation.navigate('LiveManagement', { tripId: trip._id })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="radio" size={14} color="#FFF" />
                          <Text style={styles.liveBtnTxt}>مباشر</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.manageBtn}
                        onPress={() => navigation.navigate('TripManagement', { tripId: trip._id })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.manageBtnTxt}>إدارة</Text>
                        <Ionicons name="arrow-back" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_DARK },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: 'rgba(255,255,255,0.5)', fontSize: FONTS.sm },

  // Glow Effects
  glowTop: {
    position: 'absolute', top: -60, right: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(20,184,166,0.12)',
  },
  glowBottom: {
    position: 'absolute', bottom: 100, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(96,165,250,0.07)',
  },

  // App Bar
  appBar: {
    paddingTop: Platform.OS === 'ios' ? 58 : 46,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: '#FFFFFF' },
  addBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: TEAL_DARK, borderRadius: RADIUS.full,
    paddingVertical: 10, paddingHorizontal: 16,
    shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },
  addBtnTxt: { color: '#FFF', fontSize: FONTS.xs, fontWeight: FONTS.extraBold },

  // Stats
  statsRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg, padding: SPACING.sm,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  statVal: { fontSize: FONTS.sm, fontWeight: FONTS.extraBold },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: FONTS.bold },

  // Filter Chips
  filtersWrap: { maxHeight: 52, marginBottom: SPACING.sm },
  filtersRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: TEAL_DARK, borderColor: TEAL_LIGHT,
    shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6,
  },
  chipTxt: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.5)', fontWeight: FONTS.bold },
  chipTxtActive: { color: '#FFF' },

  // List
  list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 },

  // Empty State
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.xxl, padding: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
    marginTop: SPACING.xl,
  },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(20,184,166,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
  },
  emptyTitle: { fontSize: FONTS.md, fontWeight: FONTS.extraBold, color: '#FFF', marginBottom: 8 },
  emptySub: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg },
  emptyCta: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: TEAL_DARK, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
  },
  emptyCtaTxt: { color: '#FFF', fontSize: FONTS.sm, fontWeight: FONTS.extraBold },

  // Trip Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.xxl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  // Card Top
  cardTop: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.sm,
  },
  statusPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full,
  },
  statusTxt: { fontSize: 11, fontWeight: FONTS.extraBold },
  dateTimeBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dateStr: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.5)', fontWeight: FONTS.semiBold },
  timePill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(20,184,166,0.12)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
  },
  timePillTxt: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: TEAL_LIGHT },

  // Route
  route: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.sm },
  routeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm },
  routeDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  routeAddr: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: 'rgba(255,255,255,0.85)', textAlign: 'right' },
  routeConnector: { paddingRight: 6 },
  routeLine: { width: 2, height: 18, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: -1 },

  // Ticket Divider
  divider: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dividerHole: { width: 16, height: 16, borderRadius: 8, backgroundColor: BG_DARK, marginHorizontal: -8 },
  dividerDash: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Card Bottom
  cardBot: { padding: SPACING.base, paddingTop: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.2)' },

  occupancyWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  occupancyBar: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  occupancyFill: { height: '100%', borderRadius: 3 },
  occupancyTxt: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: 'rgba(255,255,255,0.5)' },

  metaRow: { flexDirection: 'row-reverse', gap: SPACING.sm, marginBottom: SPACING.sm },
  metaChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: FONTS.semiBold },

  actionsRow: { flexDirection: 'row-reverse', gap: SPACING.sm, justifyContent: 'flex-end' },
  cancelBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(248,113,113,0.1)', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
  },
  cancelBtnTxt: { color: '#F87171', fontSize: FONTS.xs, fontWeight: FONTS.extraBold },
  liveBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 6,
  },
  liveBtnTxt: { color: '#FFF', fontSize: FONTS.xs, fontWeight: FONTS.extraBold },
  manageBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: TEAL_DARK, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    shadowColor: TEAL_LIGHT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6,
  },
  manageBtnTxt: { color: '#FFF', fontSize: FONTS.xs, fontWeight: FONTS.extraBold },
});

export default MyTripsScreen;
