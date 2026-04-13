import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { permanentRouteService } from '../../services/permanentRouteService';
import { bookingService } from '../../services/bookingService';

const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const NAVY = '#0F172A';
const NAVY_MID = '#1E293B';

const RouteBookingsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { routeId, routeName } = route.params;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [routeId])
  );

  const fetchBookings = async () => {
    try {
      const res = await permanentRouteService.getRouteBookings(routeId);
      setBookings(res.data.data || []);
    } catch (err) {
      console.error('Error fetching route bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelBooking = (bookingId: string, passengerName: string) => {
    Alert.alert(
      'إلغاء الحجز',
      `هل تريد إلغاء حجز ${passengerName}؟`,
      [
        { text: 'تراجع', style: 'cancel' },
        {
          text: 'إلغاء الحجز',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingService.cancelBooking(bookingId, 'إلغاء من قبل الكابتن');
              await fetchBookings();
              Alert.alert('✅ تم', 'تم إلغاء الحجز وإشعار الراكب');
            } catch (err: any) {
              Alert.alert('خطأ', err.response?.data?.message || 'فشل إلغاء الحجز');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const passenger = item.passenger;
    const initials = passenger?.name?.charAt(0) || '؟';

    return (
      <View style={styles.card}>
        <View style={styles.glassHighlight} />

        {/* Passenger Info */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarTxt}>{initials}</Text>
          </View>
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{passenger?.name || 'راكب'}</Text>
            <Text style={styles.passengerPhone}>{passenger?.phone || ''}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusTxt}>
              {item.status === 'confirmed' ? '✅ مؤكد' : '⏳ انتظار'}
            </Text>
          </View>
        </View>

        {/* Locations */}
        <View style={styles.locationRow}>
          <View style={styles.locItem}>
            <View style={[styles.locDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.locTxt} numberOfLines={1}>{item.pickupLocation?.address || 'موقع الالتقاط'}</Text>
          </View>
          <View style={styles.locConnector} />
          <View style={styles.locItem}>
            <View style={[styles.locDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.locTxt} numberOfLines={1}>{item.dropoffLocation?.address || 'موقع الإيصال'}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.seatsPill}>
            <Ionicons name="people-outline" size={14} color={TEAL_LIGHT} />
            <Text style={styles.seatsTxt}>{item.seatsBooked} {item.seatsBooked === 1 ? 'مقعد' : 'مقاعد'}</Text>
          </View>
          <View style={styles.pricePill}>
            <Text style={styles.priceTxt}>{item.payment?.amount?.toFixed(2)} {item.payment?.currency}</Text>
          </View>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancelBooking(item._id, passenger?.name)}
          >
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.cancelTxt}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={[NAVY, '#0F1A2E', NAVY]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(13,148,136,0.18)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color={TEAL_LIGHT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>حجوزات المسار</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{routeName}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countTxt}>{bookings.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={TEAL_LIGHT} />
          <Text style={styles.loaderTxt}>جاري تحميل الحجوزات...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchBookings(); }}
              tintColor={TEAL_LIGHT}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={52} color={TEAL_LIGHT} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد حجوزات حالياً</Text>
              <Text style={styles.emptySubtitle}>
                ستظهر هنا حجوزات الركاب على هذا المسار تلقائياً عند تأكيدها
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  header: {
    paddingTop: Platform.OS === 'ios' ? 55 : 44,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(13,148,136,0.15)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginHorizontal: 14 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'right' },
  headerSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 2 },
  countBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(13,148,136,0.2)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  countTxt: { color: TEAL_LIGHT, fontSize: 18, fontWeight: '900' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loaderTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  listContent: { padding: 20, paddingBottom: 100 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14, overflow: 'hidden', position: 'relative',
  },
  glassHighlight: {
    position: 'absolute', top: 0, left: '10%', right: '10%',
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
  },

  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(13,148,136,0.2)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },
  avatarTxt: { color: TEAL_LIGHT, fontSize: 20, fontWeight: '900' },
  passengerInfo: { flex: 1 },
  passengerName: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  passengerPhone: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'right', marginTop: 2 },
  statusBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  statusTxt: { color: '#10B981', fontSize: 11, fontWeight: '900' },

  locationRow: { marginBottom: 14, paddingHorizontal: 4 },
  locItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  locDot: { width: 8, height: 8, borderRadius: 4 },
  locTxt: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  locConnector: { height: 14, width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 3, marginVertical: 4 },

  cardFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  seatsPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(13,148,136,0.1)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(13,148,136,0.2)',
  },
  seatsTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  pricePill: {
    flex: 1,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
  },
  priceTxt: { color: '#10B981', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  cancelBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  cancelTxt: { color: '#EF4444', fontSize: 12, fontWeight: '800' },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 60, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
  },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(13,148,136,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600',
    textAlign: 'center', marginTop: 8, paddingHorizontal: 30,
  },
});

export default RouteBookingsScreen;
