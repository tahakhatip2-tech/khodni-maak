import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, StatusBar, Platform, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types';

const { width } = Dimensions.get('window');

// ── Passenger Navy Brand ──────────────────────────
const BLUE_ACCENT = '#3B82F6';
const ORANGE_ACCENT = '#F97316';
const NAVY = '#0F172A';

const BookingConfirmScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingService.getBookingById(bookingId)
      .then(r => setBooking(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <View style={styles.center}>
       <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
       <ActivityIndicator size="large" color={BLUE_ACCENT} />
       <Text style={styles.loadingTxt}>جاري تأكيد حجزك...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />
      
      {/* Dynamic 3D Header Background */}
      <View style={styles.headerBackground}>
        <ImageBackground
          source={require('../../../assets/images/welcome_bg_3d.png')}
          style={StyleSheet.absoluteFillObject}
          imageStyle={{ opacity: 0.15 }}
        />
        <LinearGradient colors={['rgba(59,130,246,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Success Header Area */}
        <View style={styles.successSection}>
          <View style={styles.successIconWrapper}>
             <LinearGradient colors={[BLUE_ACCENT, '#1D4ED8']} style={styles.successIconInner}>
               <Ionicons name="checkmark" size={48} color="#FFF" />
             </LinearGradient>
          </View>
          <Text style={styles.successTitle}>تم الحجز بنجاح</Text>
          <Text style={styles.successSub}>سيتم إشعار الكابتن بطلبك فوراً</Text>
        </View>

        {/* Smart Ticket (Receipt) in Glassmorphism */}
        {booking && (
          <View style={styles.ticketCard}>
            <View style={styles.glassHighlight} />
            
            <View style={styles.ticketHeader}>
               <Text style={styles.ticketTitle}>تفاصيل إيصال الرحلة</Text>
               <Text style={styles.ticketReference}>رقم التذكرة: #{booking._id.slice(-6).toUpperCase()}</Text>
            </View>

            <View style={styles.ticketDashedLine}>
               <View style={styles.holeLeft} />
               <View style={styles.holeRight} />
               <View style={styles.dashedBorder} />
            </View>

            <View style={styles.ticketBody}>
              <View style={styles.row}>
                <Text style={styles.val}>{booking.trip.captain?.name || 'الكابتن'}</Text>
                <Text style={styles.lbl}>الكابتن المضيف</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.val}>
                  {new Date(booking.trip.departureTime).toLocaleString('ar', {
                    weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
                <Text style={styles.lbl}>موعد الانطلاق</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.val}>{booking.seatsBooked} <Text style={{fontSize: 12, fontWeight: '600'}}>مقاعد محجوزة</Text></Text>
                <Text style={styles.lbl}>عدد الركاب</Text>
              </View>
            </View>

            <View style={styles.ticketFooter}>
               <View style={styles.priceBox}>
                  <Text style={styles.priceLbl}>الإجمالي</Text>
                  <Text style={styles.priceVal}>{booking.payment.amount.toFixed(1)} <Text style={{fontSize: 14}}>د.أ</Text></Text>
               </View>
               <View style={styles.paymentMethodPill}>
                  <Ionicons name={booking.payment.method === 'cash' ? 'cash-outline' : 'card-outline'} size={16} color={BLUE_ACCENT} />
                  <Text style={styles.paymentMethodTxt}>{booking.payment.method === 'cash' ? 'الدفع نقداً' : 'بطاقة ائتمان'}</Text>
               </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {booking && (
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88}
              onPress={() => navigation.replace('LiveTracking', { tripId: booking.trip._id })}>
              <Ionicons name="map-outline" size={24} color="#FFF" style={{marginRight: 10}} />
              <Text style={styles.primaryBtnText}>الانتقال للـخريطة</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.6} onPress={() => navigation.popToTop()}>
            <Text style={styles.secondaryBtnText}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  loadingTxt: { marginTop: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13 },
  
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 340, overflow: 'hidden' },

  scrollContent: { paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: 40 },

  successSection: { alignItems: 'center', marginBottom: 30 },
  successIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(59,130,246,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successIconInner: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', shadowColor: BLUE_ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 6 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  ticketCard: { 
     marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.04)', 
     borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', 
     overflow: 'hidden', zIndex: 10 
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  
  ticketHeader: { padding: 20, alignItems: 'center' },
  ticketTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  ticketReference: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '800' },

  ticketDashedLine: { position: 'relative', height: 1, marginVertical: 8 },
  dashedBorder: { position: 'absolute', left: 24, right: 24, top: 0, height: 1, borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed' },
  holeLeft: { position: 'absolute', left: -14, top: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  holeRight: { position: 'absolute', right: -14, top: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },

  ticketBody: { padding: 20, gap: 16 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  lbl: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '800' },
  val: { fontSize: 16, fontWeight: '800', color: '#FFF', textAlign: 'right', flex: 1, marginRight: 16 },
  
  ticketFooter: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 20, gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  priceBox: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  priceLbl: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  priceVal: { fontSize: 26, fontWeight: '900', color: BLUE_ACCENT },
  paymentMethodPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  paymentMethodTxt: { fontSize: 13, fontWeight: '800', color: BLUE_ACCENT },

  actions: { paddingHorizontal: 20, marginTop: 40, gap: 16 },
  primaryBtn: { flexDirection: 'row-reverse', justifyContent: 'center', backgroundColor: BLUE_ACCENT, borderRadius: 20, height: 56, alignItems: 'center', shadowColor: BLUE_ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  
  secondaryBtn: { borderRadius: 20, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  secondaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});

export default BookingConfirmScreen;
