import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, StatusBar, Platform, ImageBackground, ScrollView, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { bookingService } from '../../services/bookingService';
import { searchRequestService } from '../../services/searchRequestService';
import { Booking } from '../../types';

const { width } = Dimensions.get('window');

// ── Passenger Navy Brand ──────────────────────────
const BLUE_ACCENT = '#3B82F6';
const VIOLET_ACCENT = '#8B5CF6'; // For requests
const ORANGE_ACCENT = '#F97316';
const NAVY = '#0F172A';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'بانتظار التأكيد', color: '#FCD34D',  bg: 'rgba(245,158,11,0.15)' },
  confirmed: { label: 'مؤكدة',         color: '#34D399',  bg: 'rgba(16,185,129,0.15)' },
  rejected:  { label: 'مرفوضة',        color: '#F87171',   bg: 'rgba(239,68,68,0.15)' },
  cancelled: { label: 'ملغاة',         color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)' },
  completed: { label: 'مكتملة',        color: BLUE_ACCENT, bg: 'rgba(59,130,246,0.15)' },
};

const MyBookingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useFocusEffect(useCallback(() => { loadData(); }, [filter]));

  const loadData = async () => {
    setLoading(true);
    try {
      if (filter === 'requests') {
        const res = await searchRequestService.getMyRequests();
        const reqs = (res.data.data || []).map((r: any) => ({ ...r, _dataType: 'request' }));
        setDataList(reqs);
      } else {
        const res = await bookingService.getMyBookings(filter === 'all' ? {} : { status: filter });
        const books = (res.data.data || []).map((b: any) => ({ ...b, _dataType: 'booking' }));
        setDataList(books);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    Alert.alert('إلغاء التذكرة', 'هل أنت متأكد أنك تريد إلغاء حجزك في هذه الرحلة؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'نعم، ألغِ الحجز', style: 'destructive', onPress: async () => {
        try {
          await bookingService.cancelBooking(bookingId);
          loadData();
        } catch {
          Alert.alert('خطأ', 'لم نتمكن من إلغاء الحجز');
        }
      }}
    ]);
  };

  const handleCancelRequest = async (id: string) => {
    Alert.alert('إلغاء الطلب', 'هل أنت متأكد أنك تريد إلغاء هذا الطلب الذكي؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'نعم، ألغِ الطلب', style: 'destructive', onPress: async () => {
        try {
          await searchRequestService.cancelRequest(id);
          loadData();
        } catch {
          Alert.alert('خطأ', 'تعذر إلغاء الطلب');
        }
      }}
    ]);
  };

  const filters = [
    { id: 'all', l: 'الكل' }, 
    { id: 'requests', l: 'طلباتي الذكية ⭐' },
    { id: 'confirmed', l: 'مؤكدة' },
    { id: 'pending', l: 'متوقعة' }, 
    { id: 'completed', l: 'مكتملة' },
  ];

  const renderBooking = (item: Booking & { _dataType: string }) => {
    const sc = statusConfig[item.status] || statusConfig.pending;
    const isActive = item.status === 'confirmed' || item.status === 'pending';
    const isCompleted = item.status === 'completed';

    return (
      <TouchableOpacity 
        style={styles.tripCard} 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('TripDetails', { tripId: item.trip._id })}
      >
        <View style={styles.glassHighlight} />
        
        {/* Header Ribbon */}
        <View style={styles.cardHeader}>
          <View style={styles.dateWrap}>
             <Ionicons name="calendar-outline" size={16} color={BLUE_ACCENT} />
             <Text style={styles.dateTxt}>
               {new Date(item.trip.departureTime).toLocaleDateString('ar', { weekday: 'short', day: 'numeric', month: 'short' })}
             </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.color + '40' }]}>
             <Text style={[styles.statusBadgeTxt, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeBox}>
          <View style={styles.routeItem}>
            <Ionicons name="location-outline" size={16} color={BLUE_ACCENT} />
            <Text style={styles.routeTxt} numberOfLines={1}>{item.trip.startLocation?.address}</Text>
          </View>
          <View style={styles.routeItem}>
            <Ionicons name="flag-outline" size={16} color={ORANGE_ACCENT} />
            <Text style={styles.routeTxt} numberOfLines={1}>{item.trip.endLocation?.address}</Text>
          </View>
        </View>

        {/* Meta details */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
             <Text style={styles.metaLbl}>الكابتن</Text>
             <Text style={styles.metaVal}>{item.trip.captain?.name || 'غير محدد'}</Text>
          </View>
          <View style={styles.metaCol}>
             <Text style={styles.metaLbl}>المقاعد</Text>
             <Text style={styles.metaVal}>{item.seatsBooked}</Text>
          </View>
          <View style={styles.metaCol}>
             <Text style={styles.metaLbl}>السعر</Text>
             <Text style={[styles.metaVal, { color: BLUE_ACCENT }]}>{item.payment.amount} د.أ</Text>
          </View>
        </View>

        {/* Card Footer Actions */}
        <View style={styles.cardFooter}>
             {isActive && (
               <>
                 <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(59,130,246,0.15)' }]} activeOpacity={0.88}
                   onPress={() => navigation.navigate('LiveTracking', { tripId: item.trip._id })}>
                   <Ionicons name="map" size={14} color={BLUE_ACCENT} />
                   <Text style={[styles.actionBtnTxt, { color: BLUE_ACCENT }]}>تعقب</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]} activeOpacity={0.88}
                   onPress={() => handleCancelBooking(item._id)}>
                   <Ionicons name="close-circle" size={14} color="#EF4444" />
                   <Text style={[styles.actionBtnTxt, { color: '#EF4444' }]}>إلغاء</Text>
                 </TouchableOpacity>
               </>
             )}
             {isCompleted && (
               <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(245,158,11,0.15)' }]} activeOpacity={0.8}
                 onPress={() => navigation.navigate('RateTrip', { tripId: item.trip._id, captainId: item.trip.captain?._id })}>
                 <Ionicons name="star" size={14} color="#FCD34D" />
                 <Text style={[styles.actionBtnTxt, { color: '#FCD34D' }]}>تقييم</Text>
               </TouchableOpacity>
             )}
             {(isActive || isCompleted) && (
               <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} activeOpacity={0.8}
                  onPress={() => navigation.navigate('Chat', { userId: item.trip.captain?._id, userName: item.trip.captain?.name, tripId: item.trip._id })}>
                 <Ionicons name="chatbubbles" size={14} color="rgba(255,255,255,0.8)" />
                 <Text style={[styles.actionBtnTxt, { color: 'rgba(255,255,255,0.8)' }]}>تواصل</Text>
               </TouchableOpacity>
             )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequest = (item: any) => {
    return (
      <View style={[styles.tripCard, { borderColor: VIOLET_ACCENT + '50' }]}>
        <View style={styles.glassHighlight} />
        
        {/* Header Ribbon */}
        <View style={styles.cardHeader}>
          <View style={styles.dateWrap}>
             <Ionicons name="search" size={16} color={VIOLET_ACCENT} />
             <Text style={styles.dateTxt}>طلب رحلة ذكي</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: VIOLET_ACCENT + '20', borderColor: VIOLET_ACCENT + '50' }]}>
             <Text style={[styles.statusBadgeTxt, { color: VIOLET_ACCENT }]}>قيد المطابقة</Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeBox}>
          <View style={styles.routeItem}>
            <Ionicons name="location-outline" size={16} color={VIOLET_ACCENT} />
            <Text style={styles.routeTxt} numberOfLines={1}>{item.startLocation?.address}</Text>
          </View>
          <View style={styles.routeItem}>
            <Ionicons name="flag-outline" size={16} color={ORANGE_ACCENT} />
            <Text style={styles.routeTxt} numberOfLines={1}>{item.endLocation?.address}</Text>
          </View>
        </View>

        {/* Meta details */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
             <Text style={styles.metaLbl}>موعد المغادرة</Text>
             <Text style={styles.metaVal}>{new Date(item.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit'})}</Text>
          </View>
          <View style={styles.metaCol}>
             <Text style={styles.metaLbl}>المقاعد</Text>
             <Text style={styles.metaVal}>{item.minSeats}</Text>
          </View>
          {item.maxPrice ? (
            <View style={styles.metaCol}>
               <Text style={styles.metaLbl}>الحد الأقصى للسعر</Text>
               <Text style={[styles.metaVal, { color: VIOLET_ACCENT }]}>{item.maxPrice} د.أ</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', flex: 1, textAlign: 'right' }}>
            نبحث عن كابتن يناسب طلبك...
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]} activeOpacity={0.88}
            onPress={() => handleCancelRequest(item._id)}>
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={[styles.actionBtnTxt, { color: '#EF4444' }]}>إلغاء الطلب</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      {/* ── App Header ── */}
      <View style={styles.header}>
        <ImageBackground
          source={require('../../../assets/images/welcome_bg_3d.png')}
          style={StyleSheet.absoluteFillObject}
          imageStyle={{ opacity: 0.15 }}
        />
        <LinearGradient colors={['rgba(59,130,246,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerContent}>
           <View style={{ flex: 1 }} />
           <Text style={styles.headerTitle}>سجل التذاكر</Text>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
             <Ionicons name="arrow-forward" size={24} color="#FFF" />
           </TouchableOpacity>
        </View>

        {/* Smart Filters Sticky inside Header */}
        <View style={styles.filterWrapper}>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {filters.map(f => (
                <TouchableOpacity key={f.id} activeOpacity={0.88}
                  style={[styles.filterTab, filter === f.id && styles.filterActive, f.id === 'requests' && filter === 'requests' && { borderColor: VIOLET_ACCENT, backgroundColor: VIOLET_ACCENT + '20' }]}
                  onPress={() => setFilter(f.id)}>
                  <Text style={[styles.filterText, filter === f.id && styles.filterTextActive, f.id === 'requests' && filter === 'requests' && { color: VIOLET_ACCENT }]}>{f.l}</Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
           <ActivityIndicator size="large" color={BLUE_ACCENT} />
           <Text style={styles.loadingBoxTxt}>جاري تحميل البيانات...</Text>
        </View>
      ) : (
        <FlatList
          data={dataList}
          keyExtractor={i => i._id}
          renderItem={({ item }) => item._dataType === 'request' ? renderRequest(item) : renderBooking(item as any)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={BLUE_ACCENT} refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name={filter === 'requests' ? "search-circle-outline" : "ticket-outline"} size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyTitle}>لا يوجد بيانات</Text>
              <Text style={styles.emptyDesc}>
                 {filter === 'requests' ? 'لم تقم بإنشاء أي طلبات ذكية للبحث عن مسار.' : 'لا توجد تذاكر أو حجوزات هنا.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden', position: 'relative',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10 },
  headerTitle: { flex: 2, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#FFF' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: 44 },

  filterWrapper: { paddingHorizontal: 20, paddingBottom: 20 },
  filterRow: { flexDirection: 'row-reverse', gap: 10, paddingVertical: 4 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: BLUE_ACCENT },
  filterText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },
  filterTextActive: { color: BLUE_ACCENT, fontWeight: '800' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingBoxTxt: { marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },

  list: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 16 },
  
  emptyWrap: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  emptyTitle: { color: '#FFF', fontSize: 15, marginTop: 16, fontWeight: '800', textAlign: 'center' },
  emptyDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },

  tripCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  dateTxt: { fontSize: 13, fontWeight: '800', color: '#FFF', textAlign: 'right' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusBadgeTxt: { fontSize: 11, fontWeight: '800' },

  routeBox: { gap: 12, paddingRight: 4, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  routeItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  routeTxt: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textAlign: 'right' },

  metaRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, marginBottom: 16 },
  metaCol: { alignItems: 'center' },
  metaLbl: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 4 },
  metaVal: { fontSize: 14, color: '#FFF', fontWeight: '900' },

  cardFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'flex-start' },
  actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  actionBtnTxt: { fontSize: 12, fontWeight: '800' },
});

export default MyBookingsScreen;
