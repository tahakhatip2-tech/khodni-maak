import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Platform, StatusBar, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

const TEAL_DARK  = '#0D9488';
const TEAL_LIGHT = '#00D4AA';
const { width } = Dimensions.get('window');

// ── Simple bar chart data helper ──────────────────────────
const getDayLabel = (i: number) => {
  const days = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return days[d.getDay()];
};

const EarningsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [trips, setTrips]       = useState<Trip[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await tripService.getCaptainTrips('completed');
      setTrips(res.data.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const totalEarnings  = trips.reduce((s, t) => s + t.pricePerSeat * t.bookedSeats, 0);
  const todayEarnings  = trips
    .filter(t => new Date(t.departureTime).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.pricePerSeat * t.bookedSeats, 0);
  const avgPerTrip = trips.length ? (totalEarnings / trips.length) : 0;

  // Build last-7-days bar chart
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const earn = trips
      .filter(t => new Date(t.departureTime).toDateString() === dayStr)
      .reduce((s, t) => s + t.pricePerSeat * t.bookedSeats, 0);
    return { earn, label: getDayLabel(i) };
  });
  const maxBar = Math.max(...weekBars.map(b => b.earn), 1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Teal header background */}
      <View style={styles.headerBg}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>→</Text>
        </TouchableOpacity>
        <Text style={styles.title}>سجل الأرباح 💰</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={TEAL_LIGHT} />}
      >
        {/* ── Hero Earnings Card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLbl}>إجمالي الأرباح المتراكمة</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroCurrency}>JOD</Text>
            <Text style={styles.heroVal}>{totalEarnings.toFixed(2)}</Text>
          </View>

          {/* Mini Bar Chart */}
          <View style={styles.barChart}>
            {weekBars.map((bar, i) => {
              const pct = (bar.earn / maxBar);
              const isToday = i === 6;
              return (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      {
                        height: `${Math.max(pct * 100, 6)}%` as any,
                        backgroundColor: isToday ? TEAL_LIGHT : 'rgba(255,255,255,0.35)',
                      }
                    ]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && { color: TEAL_LIGHT }]}>{bar.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </View>
            <Text style={styles.statVal}>{todayEarnings.toFixed(1)}</Text>
            <Text style={styles.statCurr}>JOD</Text>
            <Text style={styles.statLbl}>ربح اليوم</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Text style={{ fontSize: 20 }}>✅</Text>
            </View>
            <Text style={styles.statVal}>{trips.length}</Text>
            <Text style={styles.statCurr}>رحلة</Text>
            <Text style={styles.statLbl}>مكتملة</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#0D948820' }]}>
              <Text style={{ fontSize: 20 }}>📊</Text>
            </View>
            <Text style={styles.statVal}>{avgPerTrip.toFixed(1)}</Text>
            <Text style={styles.statCurr}>JOD</Text>
            <Text style={styles.statLbl}>متوسط كل رحلة</Text>
          </View>
        </View>

        {/* ── Transactions List ── */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTxt}>تاريخ المعاملات 📋</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={TEAL_LIGHT} size="large" style={{ marginTop: 40 }} />
        ) : trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>💸</Text>
            <Text style={styles.emptyTitle}>لا توجد أرباح بعد</Text>
            <Text style={styles.emptySub}>أكمل رحلاتك لتظهر هنا مدخولاتك.</Text>
          </View>
        ) : (
          trips.map(item => (
            <View key={item._id} style={styles.txCard}>
              <View style={styles.txIconWrap}>
                <Text style={{ fontSize: 20 }}>💰</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txRoute} numberOfLines={1}>
                  {item.startLocation.address.split(',')[0]}
                  <Text style={{ color: COLORS.textMuted }}> ← </Text>
                  {item.endLocation.address.split(',')[0]}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(item.departureTime).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                  {'  ·  '}
                  <Text style={{ color: COLORS.textSecondary }}>{item.bookedSeats} ركاب</Text>
                </Text>
              </View>
              <View style={styles.txEarning}>
                <Text style={styles.txAmount}>+{(item.pricePerSeat * item.bookedSeats).toFixed(1)}</Text>
                <Text style={styles.txCurr}>JOD</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF9' },

  headerBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 380,
    backgroundColor: TEAL_DARK,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    overflow: 'hidden', ...SHADOWS.large,
  },
  bgCircle1: { position: 'absolute', top: -50, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.06)' },
  bgCircle2: { position: 'absolute', bottom: 60, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(0,0,0,0.05)' },

  appBar: {
    paddingTop: Platform.OS === 'ios' ? 58 : 46, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: COLORS.white, fontSize: 18, fontWeight: FONTS.bold },
  title: { fontSize: FONTS.xl, fontWeight: FONTS.extraBold, color: COLORS.white },

  // Hero Card
  heroCard: {
    marginHorizontal: SPACING.xl, marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.xxl, padding: SPACING.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  heroLbl: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.8)', fontWeight: FONTS.semiBold, textAlign: 'right', marginBottom: 4 },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6, marginBottom: SPACING.xl },
  heroVal: { fontSize: 50, fontWeight: FONTS.extraBold, color: COLORS.white },
  heroCurrency: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: TEAL_LIGHT },

  // Bar Chart
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 70 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '65%', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: FONTS.bold },

  // Stats Row
  statsRow: {
    flexDirection: 'row-reverse', paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg, gap: SPACING.sm,
  },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', gap: 4, ...SHADOWS.medium },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: FONTS.lg, fontWeight: FONTS.extraBold, color: COLORS.textPrimary },
  statCurr: { fontSize: 9, color: COLORS.textMuted, fontWeight: FONTS.bold, marginTop: -4 },
  statLbl: { fontSize: 9, color: COLORS.textSecondary, fontWeight: FONTS.semiBold, textAlign: 'center' },

  listHeader: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.sm },
  listHeaderTxt: { fontSize: FONTS.md, fontWeight: FONTS.extraBold, color: COLORS.textPrimary, textAlign: 'right' },

  // Transaction Cards
  txCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: COLORS.white, marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm, borderRadius: RADIUS.xl,
    padding: SPACING.base, borderWidth: 1, borderColor: '#E8F5F3',
    ...SHADOWS.small,
  },
  txIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: TEAL_LIGHT + '15', alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.md },
  txInfo: { flex: 1, alignItems: 'flex-end' },
  txRoute: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary, marginBottom: 4, textAlign: 'right' },
  txDate: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  txEarning: { alignItems: 'flex-start', minWidth: 55 },
  txAmount: { fontSize: FONTS.md, fontWeight: FONTS.extraBold, color: COLORS.success },
  txCurr: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },

  emptyBox: { alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl },
  emptyTitle: { fontSize: FONTS.md, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center' },
});

export default EarningsScreen;
