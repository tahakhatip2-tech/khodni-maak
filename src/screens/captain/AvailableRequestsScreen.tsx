import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
  Alert, Animated, Modal, TextInput, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../../services/api';
import socketService from '../../services/socketService';

const { width } = Dimensions.get('window');
const NAVY       = '#0F172A';
const TEAL       = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const ORANGE     = '#F97316';
const GREEN      = '#10B981';
const VIOLET     = '#7C3AED';

// ── مساعد: وقت منذ
const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1)  return 'الآن';
  if (diff < 60) return `منذ ${diff} د`;
  if (diff < 1440) return `منذ ${Math.floor(diff / 60)} س`;
  return `منذ ${Math.floor(diff / 1440)} يوم`;
};

// ── مساعد: وقت المغادرة
const formatDeparture = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString('ar', {
    weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
};

// ══════════════════════════════════════════════════════════════
// شاشة الطلبات المتاحة للكابتن
// ══════════════════════════════════════════════════════════════
const AvailableRequestsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [captainLoc, setCaptainLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [filterNearby, setFilterNearby] = useState(false);

  // Accept modal
  const [selectedReq, setSelectedReq]     = useState<any>(null);
  const [acceptModal, setAcceptModal]     = useState(false);
  const [pricePerSeat, setPricePerSeat]   = useState('2');
  const [availableSeats, setAvailableSeats] = useState('4');
  const [notes, setNotes]                 = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const headerScale = useRef(new Animated.Value(0.95)).current;

  // ── تحميل الطلبات ─────────────────────────────────────
  const loadRequests = async (loc?: { lat: number; lng: number }) => {
    try {
      const params: any = { maxDistanceKm: filterNearby ? 20 : 50 };
      if (loc || captainLoc) {
        const { lat, lng } = loc || captainLoc!;
        params.lat = lat;
        params.lng = lng;
      }
      const res = await api.get('/search-requests/available', { params });
      setRequests(res.data.data || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  // ── الحصول على موقع الكابتن ───────────────────────────
  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch { return null; }
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const loc = await fetchLocation();
        if (loc) setCaptainLoc(loc);
        await loadRequests(loc || undefined);
      })();

      // الاستماع لإلغاء طلبات (في حال قبلها كابتن آخر)
      socketService.on('search_request_accepted', () => {
        loadRequests();
      });

      // انيميشن
      Animated.spring(headerScale, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
      }).start();

      return () => {
        socketService.off('search_request_accepted');
      };
    }, [filterNearby])
  );

  // ── قبول الطلب ────────────────────────────────────────
  const handleAccept = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/search-requests/${selectedReq._id}/accept`, {
        pricePerSeat: parseFloat(pricePerSeat) || 2,
        availableSeats: parseInt(availableSeats) || 4,
        notes,
      });

      setAcceptModal(false);
      setSelectedReq(null);
      setPricePerSeat('2');
      setNotes('');

      // إزالة الطلب من القائمة
      setRequests(prev => prev.filter(r => r._id !== selectedReq._id));

      Alert.alert(
        'تم بنجاح! 🎉',
        `تم إنشاء الرحلة وإخطار الراكب. يمكنك إدارتها من قسم رحلاتي.`,
        [{
          text: 'عرض الرحلة',
          onPress: () => navigation.navigate('TripManagement', {
            tripId: res.data.data.trip._id,
          }),
        }, { text: 'حسناً' }]
      );
    } catch (err: any) {
      Alert.alert('خطأ', err?.response?.data?.message || 'تعذّر قبول الطلب، ربما قبله كابتن آخر');
      loadRequests();
    } finally {
      setSubmitting(false);
    }
  };

  // ── بطاقة الطلب ──────────────────────────────────────
  const RequestCard = ({ item }: { item: any }) => {
    const [expanded, setExpanded] = useState(false);
    const passenger = item.user;

    return (
      <Animated.View style={styles.card}>
        <View style={styles.cardGlow} />

        {/* Header Row */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.85}
        >
          {/* Avatar */}
          <LinearGradient colors={['#1E3A5F', '#0F172A']} style={styles.avatar}>
            <Text style={styles.avatarTxt}>
              {passenger?.name?.charAt(0)?.toUpperCase() || 'ر'}
            </Text>
          </LinearGradient>

          {/* Passenger Info */}
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{passenger?.name || 'راكب مجهول'}</Text>
            <View style={styles.metaRow}>
              {passenger?.rating?.average && (
                <>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.metaTxt}>{Number(passenger.rating.average).toFixed(1)}</Text>
                  <Text style={styles.metaDot}>·</Text>
                </>
              )}
              <Text style={styles.metaTxt}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {/* Seats Badge */}
          <View style={styles.seatsBadge}>
            <Ionicons name="people" size={13} color={TEAL_LIGHT} />
            <Text style={styles.seatsTxt}>{item.minSeats} مقعد</Text>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="rgba(255,255,255,0.4)"
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>

        {/* Route */}
        <View style={styles.routeWrap}>
          <View style={styles.routeLineCol}>
            <View style={styles.dotGreen} />
            <View style={styles.routeBar} />
            <View style={styles.dotOrange} />
          </View>
          <View style={styles.routeAddresses}>
            <Text style={styles.addr} numberOfLines={1}>{item.startLocation?.address}</Text>
            <Text style={styles.addr} numberOfLines={1}>{item.endLocation?.address}</Text>
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.expandedSection}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={TEAL_LIGHT} />
              <Text style={styles.detailTxt}>
                موعد الرحلة: {formatDeparture(item.departureTime)}
                {item.flexibleTime && '  (مرن)'}
              </Text>
            </View>
            {item.maxPrice && (
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={14} color={GREEN} />
                <Text style={styles.detailTxt}>
                  الحد الأقصى للسعر: {item.maxPrice} د.أ/مقعد
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={ORANGE} />
              <Text style={styles.detailTxt}>
                ينتهي في: {new Date(item.expiresAt).toLocaleDateString('ar')}
              </Text>
            </View>
          </View>
        )}

        {/* Accept Button */}
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => {
            setSelectedReq(item);
            if (item.maxPrice) setPricePerSeat(item.maxPrice.toString());
            setAcceptModal(true);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[TEAL, '#065F46']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={styles.acceptTxt}>قبول الطلب وإنشاء الرحلة</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#0B1017', '#0F172A', '#0B1017']} style={StyleSheet.absoluteFillObject} />

      {/* ── Header ── */}
      <Animated.View style={[styles.header, { transform: [{ scale: headerScale }] }]}>
        <LinearGradient
          colors={['rgba(13,148,136,0.12)', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-forward" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle}>الطلبات المتاحة</Text>
            <Text style={styles.headerSub}>
              {loading ? 'جاري التحميل...' : `${requests.length} طلب بانتظارك`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, filterNearby && styles.filterBtnActive]}
            onPress={() => setFilterNearby(!filterNearby)}
          >
            <Ionicons name="locate" size={18} color={filterNearby ? '#FFF' : TEAL_LIGHT} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Filter Info ── */}
      {filterNearby && (
        <View style={styles.nearbyBanner}>
          <Ionicons name="location" size={14} color={TEAL_LIGHT} />
          <Text style={styles.nearbyTxt}>عرض الطلبات ضمن 20 كم من موقعك</Text>
          <TouchableOpacity onPress={() => setFilterNearby(false)}>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── List ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRequests(); }}
            tintColor={TEAL}
          />
        }
      >
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={styles.loadingTxt}>جاري تحميل الطلبات...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={40} color={TEAL + '60'} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد طلبات حالياً</Text>
            <Text style={styles.emptySub}>
              {filterNearby
                ? 'جرب توسيع نطاق البحث بإيقاف فلتر القرب'
                : 'سيظهر هنا كل طلبات الراكبين الباحثين عن رحلة جماعية'}
            </Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setLoading(true); loadRequests(); }}
            >
              <Ionicons name="refresh" size={16} color={TEAL_LIGHT} />
              <Text style={styles.refreshTxt}>تحديث</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={16} color={ORANGE} />
              <Text style={styles.infoTxt}>
                اختر طلباً وقم بقبوله لإنشاء رحلة جماعية جديدة يُشعر الراكب بها فوراً
              </Text>
            </View>
            {requests.map(item => (
              <RequestCard key={item._id} item={item} />
            ))}
          </>
        )}
      </ScrollView>

      {/* ══ Accept Modal ══════════════════════════════════ */}
      <Modal
        visible={acceptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <LinearGradient colors={['rgba(18,24,48,0.99)', '#0B1017']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.modalGlow} />
            <View style={styles.handle} />

            <Text style={styles.modalTitle}>تفاصيل الرحلة الجديدة</Text>
            <Text style={styles.modalSub}>
              {selectedReq?.startLocation?.address} → {selectedReq?.endLocation?.address}
            </Text>

            {/* Price */}
            <Text style={styles.inputLabel}>سعر المقعد (د.أ)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="cash-outline" size={18} color={TEAL_LIGHT} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={pricePerSeat}
                onChangeText={setPricePerSeat}
                keyboardType="decimal-pad"
                placeholder="مثال: 1.5"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            {/* Seats */}
            <Text style={styles.inputLabel}>عدد المقاعد المتاحة</Text>
            <View style={styles.seatsRow}>
              {['1','2','3','4','5','6','7'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.seatOpt, availableSeats === s && styles.seatOptActive]}
                  onPress={() => setAvailableSeats(s)}
                >
                  <Text style={[styles.seatOptTxt, availableSeats === s && { color: '#FFF' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.inputLabel}>ملاحظات (اختياري)</Text>
            <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
              <TextInput
                style={[styles.input, { textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="أي معلومات إضافية للراكب..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setAcceptModal(false)}
              >
                <Text style={styles.cancelModalTxt}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleAccept}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[TEAL, '#065F46']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.confirmTxt}>إنشاء الرحلة</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13,148,136,0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderWidth: 1, borderColor: TEAL + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  headerSub:   { fontSize: 12, color: TEAL_LIGHT, fontWeight: '700', marginTop: 2 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderWidth: 1, borderColor: TEAL + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: TEAL, borderColor: TEAL },

  // Nearby Banner
  nearbyBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: TEAL + '15',
    borderWidth: 1, borderColor: TEAL + '30',
    marginHorizontal: 16, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 10,
  },
  nearbyTxt: { flex: 1, color: TEAL_LIGHT, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  // Scroll
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },

  // Center (loading/empty)
  centerWrap: { alignItems: 'center', paddingVertical: 80, gap: 14 },
  loadingTxt: { color: 'rgba(255,255,255,0.45)', fontWeight: '700', fontSize: 14 },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 60, gap: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed', marginTop: 20,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: TEAL + '10', borderWidth: 1, borderColor: TEAL + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  emptySub:   { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'center', paddingHorizontal: 30 },
  refreshBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: TEAL + '18', borderRadius: 14, borderWidth: 1,
    borderColor: TEAL + '35', paddingHorizontal: 20, paddingVertical: 10, marginTop: 4,
  },
  refreshTxt: { color: TEAL_LIGHT, fontSize: 13, fontWeight: '800' },

  // Info Banner
  infoBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderWidth: 1, borderColor: ORANGE + '30',
    borderRadius: 14, padding: 12, marginBottom: 16,
  },
  infoTxt: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700', textAlign: 'right' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(13,148,136,0.2)',
    marginBottom: 14,
  },
  cardGlow: {
    position: 'absolute', top: 0, left: '15%', right: '15%',
    height: 1, backgroundColor: 'rgba(20,184,166,0.3)',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  passengerInfo: { flex: 1, alignItems: 'flex-end' },
  passengerName: { fontSize: 14, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 3 },
  metaTxt: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '700' },
  metaDot: { color: 'rgba(255,255,255,0.25)', fontSize: 11 },
  seatsBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: TEAL + '18', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: TEAL + '35',
  },
  seatsTxt: { fontSize: 11, color: TEAL_LIGHT, fontWeight: '800' },

  // Route
  routeWrap: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingBottom: 14,
  },
  routeLineCol: { width: 16, alignItems: 'center', paddingVertical: 3 },
  dotGreen:  { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },
  dotOrange: { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  routeBar:  { flex: 1, width: 1.5, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 3 },
  routeAddresses: { flex: 1, gap: 10, justifyContent: 'space-between' },
  addr: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'right' },

  // Expanded
  expandedSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14, gap: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  detailRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  detailTxt: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '700', flex: 1, textAlign: 'right' },

  // Accept Button
  acceptBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 15, overflow: 'hidden',
    borderTopWidth: 1, borderTopColor: 'rgba(13,148,136,0.2)',
  },
  acceptTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 28,
    overflow: 'hidden',
    borderTopWidth: 1, borderTopColor: TEAL + '30',
  },
  modalGlow: {
    position: 'absolute', top: 0, left: '20%', right: '20%',
    height: 1, backgroundColor: TEAL_LIGHT + '50',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 4 },
  modalSub:   { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textAlign: 'right', marginBottom: 20 },

  inputLabel: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, height: 52, marginBottom: 16, gap: 8,
  },
  inputIcon: { marginLeft: 4 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '700', textAlign: 'right' },

  seatsRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 16 },
  seatOpt: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  seatOptActive: { backgroundColor: TEAL, borderColor: TEAL },
  seatOptTxt: { fontSize: 14, fontWeight: '900', color: 'rgba(255,255,255,0.4)' },

  modalBtns: { flexDirection: 'row-reverse', gap: 12, marginTop: 8 },
  cancelModalBtn: {
    flex: 1, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelModalTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '800' },
  confirmBtn: {
    flex: 2, height: 52, borderRadius: 18,
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, overflow: 'hidden',
  },
  confirmTxt: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});

export default AvailableRequestsScreen;
