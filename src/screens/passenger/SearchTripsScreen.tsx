import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Platform,
  StatusBar, ImageBackground, Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SHADOWS } from '../../constants/theme';
import { tripService } from '../../services/tripService';
import { permanentRouteService } from '../../services/permanentRouteService';
import { useAuth } from '../../context/AuthContext';
import { Trip } from '../../types';

const NAVY    = '#0F172A';
const BLUE    = '#3B82F6';
const ORANGE  = '#F97316';
const VIOLET  = '#7C3AED';

// ── Helpers ──────────────────────────────────────────────────────
const mapPermanentRoute = (route: any): any => {
  const activeCaptains = route.subscribedCaptains?.filter((s: any) => s.status === 'active') || [];
  const today = new Date();
  const [h, m] = (route.departureTime || '00:00').split(':');
  const dep = new Date(today.getFullYear(), today.getMonth(), today.getDate(), +h, +m);
  return {
    ...route,
    tripType: 'scheduled_route',
    isPermanentRoute: true,
    departureTime: dep.toISOString(),
    captain: {
      name: 'مسار معتمد (عدة كباتن)',
      rating: route.averageRating || 5,
      totalRatings: route.totalTripsCompleted || 0,
    },
    remainingSeats: route.seatsPerCaptain * activeCaptains.length,
  };
};

// ── Screen ────────────────────────────────────────────────────────
const SearchTripsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [allTrips, setAllTrips] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // filter / sort
  const [sortBy, setSortBy] = useState<'time' | 'price' | 'rating'>('time');
  const [typeFilter, setTypeFilter] = useState<'all' | 'scheduled' | 'permanent'>('all');

  // text search (client-side)
  const [query, setQuery] = useState('');

  // ── Fetch ALL trips from DB ───────────────────────────────────
  const loadAll = async () => {
    try {
      const [tripsRes, routesRes] = await Promise.all([
        tripService.searchTrips({ maxDistance: 9999, seats: 1 }),   // no geo filter → all trips
        permanentRouteService.getRoutes('active'),
      ].map(p => p.catch(() => ({ data: { data: [] } }))));

      const trips: any[]  = tripsRes.data?.data  || [];
      const routes: any[] = (routesRes.data?.data || [])
        .map(mapPermanentRoute)
        .filter((r: any) => r.remainingSeats > 0);

      setAllTrips([...trips, ...routes]);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  // ── Client-side filter + sort + text search ───────────────────
  const displayed = React.useMemo(() => {
    let list = [...allTrips];

    // type filter
    if (typeFilter === 'scheduled')  list = list.filter(t => !t.isPermanentRoute);
    if (typeFilter === 'permanent')  list = list.filter(t => t.isPermanentRoute);

    // text search (Arabic-friendly)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(t =>
        t.startLocation?.address?.toLowerCase().includes(q) ||
        t.endLocation?.address?.toLowerCase().includes(q)   ||
        t.captain?.name?.toLowerCase().includes(q)
      );
    }

    // sort
    if (sortBy === 'price')  list.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    if (sortBy === 'rating') list.sort((a, b) => ((b.captain?.rating as any)?.average ?? b.captain?.rating ?? 0) - ((a.captain?.rating as any)?.average ?? a.captain?.rating ?? 0));
    if (sortBy === 'time')   list.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

    return list;
  }, [allTrips, typeFilter, sortBy, query]);

  // ── Sub-components ────────────────────────────────────────────
  const FilterChip = ({ label, icon, active, onPress }: any) => (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={15} color={active ? '#FFF' : 'rgba(255,255,255,0.45)'} />
      <Text style={[styles.chipTxt, active && { color: '#FFF' }]}>{label}</Text>
    </TouchableOpacity>
  );

  const TripCard = ({ trip }: { trip: any }) => {
    const isPerm = trip.isPermanentRoute;
    const rating = Number((trip.captain?.rating as any)?.average ?? trip.captain?.rating ?? 0);
    const isBookedByMe = trip.passengers?.some((p: any) => p.user === user?._id || p.user?._id === user?._id);

    return (
      <TouchableOpacity
        style={[styles.card, isPerm && styles.cardPerm, isBookedByMe && { borderColor: 'rgba(52, 211, 153, 0.4)' }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('TripDetails', { tripId: trip._id, isPermanentRoute: isPerm })}
      >
        <View style={styles.glassHighlight} />

        {isPerm && (
          <View style={styles.permBadge}>
            <Ionicons name="repeat" size={10} color="#FFF" />
            <Text style={styles.permBadgeTxt}>مسار دائم</Text>
          </View>
        )}
        
        {isBookedByMe && !isPerm && (
          <View style={[styles.permBadge, { backgroundColor: '#10B981', right: 16 }]}>
             <Ionicons name="checkmark-circle" size={12} color="#FFF" />
             <Text style={styles.permBadgeTxt}>محجوزة لك</Text>
          </View>
        )}

        {/* Header Row */}
        <View style={styles.cardTop}>
          {/* Avatar */}
          <View style={[styles.avatar, { borderColor: isPerm ? VIOLET : BLUE }]}>
            <Text style={[styles.avatarTxt, { color: isPerm ? VIOLET : BLUE }]}>
              {trip.captain?.name?.charAt(0) || 'ك'}
            </Text>
          </View>

          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.captainName} numberOfLines={1}>{trip.captain?.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingTxt}>{rating.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.priceBox}>
            <Text style={[styles.priceNum, { color: isPerm ? VIOLET : BLUE }]}>{trip.pricePerSeat}</Text>
            <Text style={styles.priceCur}>د.أ/مقعد</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeWrap}>
          <View style={styles.routeLine}>
            <View style={[styles.dot, { borderColor: BLUE }]} />
            <View style={styles.routeBar} />
            <View style={[styles.dot, { borderColor: ORANGE, backgroundColor: ORANGE }]} />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={styles.routeAddr} numberOfLines={1}>{trip.startLocation?.address}</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>{trip.endLocation?.address}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardBottom}>
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.pillTxt}>{trip.remainingSeats} مقاعد</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.pillTxt}>
              {new Date(trip.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={[styles.bookNow, { color: isBookedByMe ? '#10B981' : isPerm ? VIOLET : BLUE }]}>
              {isBookedByMe ? 'تعديل حجزك ←' : 'احجز الآن ←'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <ImageBackground
          source={require('../../../assets/images/welcome_bg_3d.png')}
          style={StyleSheet.absoluteFillObject}
          imageStyle={{ opacity: 0.12 }}
        />
        <LinearGradient colors={['rgba(59,130,246,0.18)', 'transparent']} style={StyleSheet.absoluteFillObject} />

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الرحلات المتاحة</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن منطقة، كابتن، وجهة..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter Chips Row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {/* Type */}
          <FilterChip label="الكل" icon="apps-outline"
            active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
          <FilterChip label="مجدولة" icon="car-outline"
            active={typeFilter === 'scheduled'} onPress={() => setTypeFilter('scheduled')} />
          <FilterChip label="مسارات دائمة" icon="repeat-outline"
            active={typeFilter === 'permanent'} onPress={() => setTypeFilter('permanent')} />

          <View style={styles.chipDivider} />

          {/* Sort */}
          <FilterChip label="الأقرب موعداً" icon="time-outline"
            active={sortBy === 'time'} onPress={() => setSortBy('time')} />
          <FilterChip label="الأقل سعراً" icon="pricetag-outline"
            active={sortBy === 'price'} onPress={() => setSortBy('price')} />
          <FilterChip label="الأعلى تقييماً" icon="star-outline"
            active={sortBy === 'rating'} onPress={() => setSortBy('rating')} />
        </ScrollView>
      </View>

      {/* Floating Action Button for 'Request Trip' */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateSearchRequest')}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle" size={24} color="#FFF" />
        <Text style={styles.fabTxt}>اطلب رحلة مسار</Text>
      </TouchableOpacity>

      {/* ── Results ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAll(); }}
            tintColor={BLUE}
          />
        }
      >
        {/* Count */}
        <View style={styles.countRow}>
          <Text style={styles.countTxt}>
            {loading ? 'جاري التحميل...' : `${displayed.length} رحلة متاحة`}
          </Text>
          {!loading && allTrips.length > 0 && (
            <Text style={styles.totalTxt}>من أصل {allTrips.length}</Text>
          )}
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.loadingTxt}>جاري جلب كل الرحلات المتاحة...</Text>
          </View>
        ) : displayed.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={52} color="rgba(255,255,255,0.12)" />
            <Text style={styles.emptyTitle}>لا توجد رحلات تطابق بحثك</Text>
            <Text style={styles.emptySub}>
              {query ? `لا يوجد نتائج لـ "${query}"` : 'جرب تغيير الفلاتر أو شد لأعلى للتحديث'}
            </Text>
            {query.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')}>
                <Text style={styles.clearBtnTxt}>مسح البحث</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayed.map(trip => <TripCard key={trip._id} trip={trip} />)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 38,
    paddingBottom: 12,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },

  // Search
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Chips
  chipsRow: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 20, paddingBottom: 4 },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  chipTxt: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700' },
  chipDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },

  // Count row
  countRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  countTxt: { fontSize: 15, fontWeight: '900', color: '#FFF' },
  totalTxt: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },

  // Loading
  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    marginTop: 20,
    gap: 10,
  },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  emptySub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 },
  clearBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLUE,
  },
  clearBtnTxt: { color: BLUE, fontSize: 13, fontWeight: '800' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardPerm: {
    borderColor: 'rgba(124,58,237,0.35)',
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  glassHighlight: {
    position: 'absolute', top: 0, left: '10%', right: '10%',
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  permBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: VIOLET,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  permBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 18, fontWeight: '900' },
  captainName: { fontSize: 14, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 3 },
  ratingTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  priceBox: { alignItems: 'flex-end' },
  priceNum: { fontSize: 22, fontWeight: '900' },
  priceCur: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '700' },

  routeWrap: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
  routeLine: { width: 20, alignItems: 'center', paddingVertical: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, backgroundColor: NAVY },
  routeBar: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 3 },
  routeAddr: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textAlign: 'right' },

  cardBottom: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pillTxt: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700' },
  bookNow: { fontSize: 13, fontWeight: '900' },

  fab: {
    position: 'absolute', bottom: 30, left: 20, zIndex: 100,
    backgroundColor: BLUE, paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 30, flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  fabTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' }
});

export default SearchTripsScreen;
