import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform, StatusBar, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';
import { tripService } from '../../services/tripService';
import { Trip } from '../../types';

const TEAL = '#0D9488';
const NAVY = '#0F172A';

const PASSENGER_STATUS: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending:     { icon: 'time-outline', label: 'في الانتظار',     color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  confirmed:   { icon: 'checkmark-circle', label: 'مؤكد',        color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  waiting:     { icon: 'location', label: 'في نقطة التجمع',      color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  picked_up:   { icon: 'car', label: 'في السيارة',               color: TEAL,      bg: 'rgba(13,148,136,0.15)' },
  dropped_off: { icon: 'flag', label: 'وصل وخرج',                color: '#64748B', bg: 'rgba(100,116,139,0.15)' },
  rejected:    { icon: 'close-circle', label: 'مرفوض',           color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  cancelled:   { icon: 'ban', label: 'ألغى الحجز',               color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

const TripManagementScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { tripId } = route.params;
  const [trip, setTrip]       = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTrip(); }, []);

  const loadTrip = async () => {
    try {
      const res = await tripService.getTripById(tripId);
      setTrip(res.data.data);
    } catch {
      Alert.alert('خطأ', 'تعذّر تحميل بيانات الرحلة.');
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (status: string) => {
    const config: Record<string, { msg: string; style: 'default' | 'destructive' }> = {
      active:    { msg: 'ابدأ الرحلة الآن وسيرى الركاب موقعك مباشرة.', style: 'default' },
      completed: { msg: 'وصلت بسلام؟ إنهاء الرحلة سيحتسب الأرباح.', style: 'default' },
      cancelled: { msg: '⚠️ سيتم إشعار جميع الركاب. هل أنت متأكد؟', style: 'destructive' },
    };
    const c = config[status];
    Alert.alert(status === 'cancelled' ? 'إلغاء الرحلة' : 'تأكيد الإجراء', c.msg, [
      { text: 'تراجع', style: 'cancel' },
      {
        text: status === 'cancelled' ? 'إلغاء الرحلة نهائياً' : 'تأكيد',
        style: c.style,
        onPress: async () => {
          try {
            await tripService.updateTripStatus(tripId, status);
            if (status === 'active') navigation.replace('LiveManagement', { tripId });
            else loadTrip();
          } catch {
            Alert.alert('خطأ', 'فشل تحديث الحالة، يرجى المحاولة مجدداً.');
          }
        }
      },
    ]);
  };

  const handlePassengerAction = async (userId: string, status: string) => {
    try {
      await tripService.updatePassengerStatus(tripId, userId, status);
      loadTrip();
    } catch {
      Alert.alert('خطأ', 'تعذّر تحديث حالة الراكب.');
    }
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={TEAL} />
      <Text style={styles.loadingTxt}>جاري تحميل الرحلة...</Text>
    </View>
  );
  if (!trip) return (
    <View style={styles.loadingWrap}>
      <Ionicons name="warning-outline" size={48} color="rgba(255,255,255,0.4)" />
      <Text style={styles.loadingTxt}>لم يتم العثور على الرحلة أو تم حذفها</Text>
      <TouchableOpacity style={styles.backBtnError} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnErrorTxt}>العودة للخلف</Text>
      </TouchableOpacity>
    </View>
  );

  const confirmedPassengers = trip.passengers.filter(
    p => p.status !== 'rejected' && p.status !== 'cancelled'
  );
  const expectedEarnings = (trip.pricePerSeat * trip.bookedSeats).toFixed(1);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Premium Navy Background */}
      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['rgba(13,148,136,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }} />
          <Text style={styles.headerTitle}>إدارة الرحلة المجدولة</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status Card */}
        <View style={styles.glassCard}>
           <View style={styles.glassHighlight} />
           <View style={styles.statusRow}>
              <View>
                 <Text style={styles.statusLabel}>الأرباح المتوقعة</Text>
                 <Text style={styles.earningsTxt}>{expectedEarnings} د.أ</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: trip.status === 'scheduled' ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.2)' }]}>
                 <Ionicons name="calendar" size={14} color={trip.status === 'scheduled' ? '#3B82F6' : '#94A3B8'} />
                 <Text style={[styles.statusChipTxt, { color: trip.status === 'scheduled' ? '#3B82F6' : '#94A3B8' }]}>
                   {trip.status === 'scheduled' ? 'مجدولة' : trip.status === 'completed' ? 'مكتملة' : 'ملغاة'}
                 </Text>
              </View>
           </View>

           <View style={styles.dateTimeWrap}>
             <View style={styles.dateCol}>
                <Ionicons name="calendar-outline" size={18} color={TEAL} />
                <Text style={styles.dateTimeVal}>{new Date(trip.departureTime).toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
             </View>
             <View style={styles.dateLine} />
             <View style={styles.dateCol}>
                <Ionicons name="time-outline" size={18} color="#F97316" />
                <Text style={styles.dateTimeVal}>{new Date(trip.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
             </View>
           </View>
        </View>

        {/* Route Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مسار الرحلة</Text>
          <View style={[styles.glassCard, { paddingVertical: 20 }]}>
            <View style={styles.routeBox}>
              <View style={styles.routePipes}>
                 <View style={[styles.routeDot, { borderColor: TEAL }]} />
                 <View style={styles.routeLine} />
                 <View style={[styles.routeDot, { borderColor: '#F97316', backgroundColor: '#F97316' }]} />
              </View>
              <View style={styles.routeTexts}>
                 <View style={styles.routeItem}>
                    <Text style={styles.routeLabel}>الانطلاق</Text>
                    <Text style={styles.routeAddress} numberOfLines={2}>{trip.startLocation.address}</Text>
                 </View>
                 <View style={styles.routeItem}>
                    <Text style={styles.routeLabel}>الوجهة</Text>
                    <Text style={styles.routeAddress} numberOfLines={2}>{trip.endLocation.address}</Text>
                 </View>
              </View>
            </View>
          </View>
        </View>

        {/* Passengers List */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>الركاب ({trip.bookedSeats}/{trip.remainingSeats + trip.bookedSeats})</Text>
          </View>

          {trip.passengers.length === 0 ? (
             <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyTxt}>لم يقم أي راكب بحجز مقعد حتى الآن.</Text>
             </View>
          ) : (
            trip.passengers.map(p => {
              const statusConfig = PASSENGER_STATUS[p.status];
              return (
                <View key={p._id} style={styles.glassCard}>
                  <View style={styles.pTopRow}>
                    <View style={styles.avatarWrap}>
                      <Text style={styles.avatarTxt}>{p.user.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.pName} numberOfLines={1}>{p.user.name}</Text>
                      <View style={[styles.pStatusPill, { backgroundColor: statusConfig.bg }]}>
                        <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                        <Text style={[styles.pStatusTxt, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Chat', { userId: p.user._id, userName: p.user.name, tripId })}>
                      <Ionicons name="chatbubble-ellipses-outline" size={22} color={TEAL} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pDetailsBox}>
                    <View style={styles.pDetailItem}>
                      <Text style={styles.pDetailLabel}>المقاعد المحجوزة</Text>
                      <Text style={styles.pDetailVal}>{p.seats}</Text>
                    </View>
                    <View style={styles.pDetailLine} />
                    <View style={styles.pDetailItem}>
                      <Text style={styles.pDetailLabel}>طريقة الاِنضمام</Text>
                      <TouchableOpacity style={styles.mapLinkBtn} onPress={() => {
                        const dl = p.pickupLocation.coordinates;
                        const url = Platform.OS === 'ios' ? `comgooglemaps://?q=${dl[1]},${dl[0]}` : `google.navigation:q=${dl[1]},${dl[0]}`;
                        Linking.canOpenURL(url).then(sup => { if (sup) Linking.openURL(url); });
                      }}>
                        <Ionicons name="location-outline" size={14} color={TEAL} />
                        <Text style={[styles.pDetailVal, { color: TEAL, textDecorationLine: 'underline' }]}>عرض الموقع</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Actions for pending passengers */}
                  {p.status === 'pending' && trip.status === 'scheduled' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' }]} onPress={() => handlePassengerAction(p.user._id, 'confirmed')}>
                        <Ionicons name="checkmark" size={18} color="#10B981" />
                        <Text style={[styles.actionBtnTxt, { color: '#10B981' }]}>قبول الراكب</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' }]} onPress={() => handlePassengerAction(p.user._id, 'rejected')}>
                        <Ionicons name="close" size={18} color="#EF4444" />
                        <Text style={[styles.actionBtnTxt, { color: '#EF4444' }]}>رفض</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── Bottom Fixed Actions ── */}
      {trip.status === 'scheduled' && confirmedPassengers.length > 0 && (
        <View style={styles.bottomBar}>
          <LinearGradient colors={['transparent', '#0F172A']} style={StyleSheet.absoluteFillObject} />
          
          <TouchableOpacity 
             style={[styles.primaryBtn, { backgroundColor: TEAL }]} 
             activeOpacity={0.8}
             onPress={() => handleUpdateStatus('active')}
          >
             <Text style={styles.primaryBtnTxt}>بدء الرحلة والتتبع الحي الآن</Text>
             <Ionicons name="play-circle-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
             style={styles.textBtn} 
             onPress={() => handleUpdateStatus('cancelled')}
          >
             <Text style={styles.textBtnTxt}>إلغاء الرحلة المجدولة</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {trip.status === 'scheduled' && confirmedPassengers.length === 0 && (
        <View style={styles.bottomBar}>
          <LinearGradient colors={['transparent', '#0F172A']} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity 
             style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#EF4444' }]} 
             activeOpacity={0.8}
             onPress={() => handleUpdateStatus('cancelled')}
          >
             <Text style={[styles.primaryBtnTxt, { color: '#EF4444' }]}>إلغاء الرحلة لعدم وجود ركاب</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  loadingWrap: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13, marginTop: 8 },
  backBtnError: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  backBtnErrorTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden', position: 'relative',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  headerTitle: { flex: 2, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#FFF' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: 44 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 150 },

  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 12 },

  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 12,
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  statusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  statusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  earningsTxt: { fontSize: 24, fontWeight: '900', color: TEAL, textAlign: 'right' },
  statusChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusChipTxt: { fontSize: 12, fontWeight: '800' },

  dateTimeWrap: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  dateCol: { flex: 1, alignItems: 'center', gap: 6 },
  dateLine: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },
  dateTimeVal: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  routeBox: { flexDirection: 'row-reverse' },
  routePipes: { width: 24, alignItems: 'center', paddingVertical: 6, marginLeft: 12 },
  routeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: '#1A1F3C' },
  routeLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  routeTexts: { flex: 1, gap: 16 },
  routeItem: { paddingBottom: 4 },
  routeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  routeAddress: { fontSize: 14, color: '#FFF', fontWeight: '800', textAlign: 'right', lineHeight: 22 },

  emptyWrap: { alignItems: 'center', paddingVertical: 30, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 12, fontWeight: '600', textAlign: 'center' },

  pTopRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13,148,136,0.15)', borderWidth: 1, borderColor: TEAL, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  avatarTxt: { fontSize: 18, fontWeight: '900', color: TEAL },
  pName: { fontSize: 15, fontWeight: '800', color: '#FFF', textAlign: 'right', marginBottom: 4 },
  pStatusPill: { flexDirection: 'row-reverse', alignSelf: 'flex-end', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pStatusTxt: { fontSize: 10, fontWeight: '800' },
  chatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

  pDetailsBox: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12 },
  pDetailItem: { flex: 1, alignItems: 'center', gap: 4 },
  pDetailLine: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  pDetailLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  pDetailVal: { fontSize: 14, color: '#FFF', fontWeight: '800' },
  mapLinkBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },

  actionRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1 },
  actionBtnTxt: { fontSize: 13, fontWeight: '800' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 40,
  },
  primaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 20, ...SHADOWS.medium },
  primaryBtnTxt: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  textBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  textBtnTxt: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});

export default TripManagementScreen;
