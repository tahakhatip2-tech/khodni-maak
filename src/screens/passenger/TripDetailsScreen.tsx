import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Platform, StatusBar, Modal
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';
import { tripService } from '../../services/tripService';
import { bookingService } from '../../services/bookingService';
import { permanentRouteService } from '../../services/permanentRouteService';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { Trip } from '../../types';

const { height, width } = Dimensions.get('window');

// ── Passenger Navy Brand ──────────────────────────
const NAVY = '#0F172A';
const BLUE_ACCENT = '#3B82F6';
const ORANGE_ACCENT = '#F97316';

// Dark Mode Map Style
const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const TripDetailsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { tripId } = route.params;
  const { location } = useLocation();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [booking, setBooking] = useState(false);
  const [myBookingId, setMyBookingId] = useState<string | null>(null);
  
  // Waypoints State for Permanent Routes
  const [pickupWaypoint, setPickupWaypoint] = useState<any>(null);
  const [dropoffWaypoint, setDropoffWaypoint] = useState<any>(null);
  const [showWaypointPicker, setShowWaypointPicker] = useState<'pickup' | 'dropoff' | null>(null);
  
  const mapRef = useRef<MapView>(null);

  useEffect(() => { loadTrip(); }, []);

  const loadTrip = async () => {
    try {
      let loadedTrip: any = null;
      if (route.params.isPermanentRoute) {
        const res = await permanentRouteService.getRouteById(tripId);
        const pRoute = res.data.data;
        const activeCaptains = pRoute.subscribedCaptains?.filter((s: any) => s.status === 'active') || [];
        const today = new Date();
        const [timeH, timeM] = (pRoute.departureTime || '00:00').split(':');
        const departureDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(timeH), parseInt(timeM));
        
        loadedTrip = {
          ...pRoute,
          isPermanentRoute: true,
          tripType: 'scheduled_route',
          departureTime: departureDate.toISOString(),
          remainingSeats: pRoute.seatsPerCaptain * activeCaptains.length,
          captain: {
             name: 'مسار معتمد (عدة كباتن)',
             rating: pRoute.averageRating || 5,
             totalRatings: pRoute.totalTripsCompleted || 0,
             vehicle: { model: 'تتحدد لاحقا', color: '', plateNumber: 'متعدد' }
          },
          preferences: { smokingAllowed: false, musicAllowed: true }
        };
        
        setPickupWaypoint({ ...pRoute.startLocation, isStart: true });
        setDropoffWaypoint({ ...pRoute.endLocation, isEnd: true });
      } else {
        const res = await tripService.getTripById(tripId);
        loadedTrip = res.data.data;
      }
      setTrip(loadedTrip);

      // Check if user already booked
      const isBooked = loadedTrip?.passengers?.some((p: any) => p.user === user?._id || p.user?._id === user?._id);
      if (isBooked) {
         // fetch the booking to get its ID
         try {
           const myBkRs = await bookingService.getMyBookings({ tripId: loadedTrip._id, role: 'passenger' });
           const myBooking = myBkRs.data.data[0];
           if (myBooking) setMyBookingId(myBooking._id);
         } catch(e){}
      }
    } catch { Alert.alert('خطأ', 'لم نتمكن من تحميل تفاصيل الرحلة'); }
    setLoading(false);
  };

  const handleBook = async () => {
    if (!trip || !location) return;
    setBooking(true);
    try {
      const payload: any = {
        pickupLocation: pickupWaypoint || {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
          address: 'موقعي الحالي',
        },
        dropoffLocation: dropoffWaypoint || {
          type: 'Point',
          coordinates: trip.endLocation.coordinates,
          address: trip.endLocation.address,
        },
        seatsBooked: seats,
        paymentMethod: paymentMethod,
      };
      
      if ((trip as any).isPermanentRoute) {
        payload.permanentRouteId = trip._id;
        payload.tripType = 'scheduled_route';
      } else {
        payload.tripId = trip._id;
      }

      const res = await bookingService.createBooking(payload);
      navigation.replace('BookingConfirm', { bookingId: res.data.data._id });
    } catch (err: any) {
      Alert.alert('خطأ', err?.response?.data?.message || 'فشل الحجز، تأكد من اتصالك وجرب مجدداً');
    }
    setBooking(false);
  };

  const handleCancelBook = () => {
    if (!myBookingId) {
      // Fallback if ID is not yet fetched
      navigation.navigate('MyBookings');
      return;
    }
    Alert.alert('تأكيد الإلغاء', 'هل أنت متأكد أنك تريد إلغاء حجزك في هذه الرحلة؟', [
      { text: 'تراجع', style: 'cancel' },
      {
        text: 'نعم، أَلغِ الحجز',
        style: 'destructive',
        onPress: async () => {
           setBooking(true);
           try {
             await bookingService.cancelBooking(myBookingId, 'إلغاء من قبل الراكب');
             Alert.alert('نجاح', 'تم إلغاء الحجز بنجاح');
             navigation.goBack();
           } catch(err: any) {
             Alert.alert('خطأ', err?.response?.data?.message || 'تعذر إلغاء الحجز');
           }
           setBooking(false);
        }
      }
    ]);
  };

  if (loading) return (
    <View style={styles.loadingWrap}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ActivityIndicator size="large" color={BLUE_ACCENT} />
      <Text style={styles.loadingTxt}>جاري تحميل تفاصيل الرحلة...</Text>
    </View>
  );
  
  if (!trip) return (
    <View style={styles.loadingWrap}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <Ionicons name="sad-outline" size={48} color="rgba(255,255,255,0.4)" />
      <Text style={styles.loadingTxt}>عذراً، هذه الرحلة لم تعد متاحة</Text>
      <TouchableOpacity style={styles.backErrorBtn} onPress={() => navigation.goBack()}>
         <Text style={styles.backErrorTxt}>العودة للخلف</Text>
      </TouchableOpacity>
    </View>
  );

  const routeCoords = trip.route?.map(pt => ({ latitude: pt[1], longitude: pt[0] })) || [];
  const remaining = trip.remainingSeats || 4;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Background Map ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={mapDarkStyle}
          showsUserLocation={false}
          showsCompass={false}
          initialRegion={{
            latitude: trip.startLocation.coordinates[1],
            longitude: trip.startLocation.coordinates[0],
            latitudeDelta: 0.1, longitudeDelta: 0.1,
          }}
        >
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor={BLUE_ACCENT} strokeWidth={4} lineCap="round" lineJoin="round" />
          )}

          <Marker coordinate={{ latitude: trip.startLocation.coordinates[1], longitude: trip.startLocation.coordinates[0] }}>
             <View style={[styles.markerPin, { backgroundColor: BLUE_ACCENT }]}>
                <Ionicons name="location" size={14} color="#FFF" />
             </View>
             <View style={[styles.markerArrow, { borderTopColor: BLUE_ACCENT }]} />
          </Marker>

          <Marker coordinate={{ latitude: trip.endLocation.coordinates[1], longitude: trip.endLocation.coordinates[0] }}>
             <View style={[styles.markerPin, { backgroundColor: ORANGE_ACCENT }]}>
                <Ionicons name="flag" size={14} color="#FFF" />
             </View>
             <View style={[styles.markerArrow, { borderTopColor: ORANGE_ACCENT }]} />
          </Marker>
        </MapView>
        <LinearGradient colors={['rgba(15,23,42,0.95)', 'transparent']} style={styles.topMapOverlay} />
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.9)']} style={styles.bottomMapOverlay} />
      </View>

      {/* ── Header Back Button ── */}
      <TouchableOpacity style={styles.backBtnWrapper} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-forward" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* ── Scrollable Details (Glassmorphism overlap) ── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.spacer} />
        
        <View style={styles.sheetContainer}>
          <LinearGradient colors={['rgba(26,31,60,0.92)', '#0F172A']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.glassHighlight} />

          {/* Captain Info Card */}
          <View style={styles.captainCard}>
            <View style={styles.captainCols}>
              <View style={styles.avatarWrap}>
                 <Text style={styles.avatarTxt}>{trip.captain?.name?.charAt(0) || 'ك'}</Text>
              </View>
              <View>
                <Text style={styles.captainName}>{trip.captain?.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingTxt}>{Number((trip.captain?.rating as any)?.average ?? trip.captain?.rating ?? 0).toFixed(1)} <Text style={{color: 'rgba(255,255,255,0.4)', fontSize: 11}}>({trip.captain?.totalRatings || 0})</Text></Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
               <Text style={styles.priceNum}>{trip.pricePerSeat}</Text>
               <Text style={styles.priceCur}>د.أ / مقعد</Text>
            </View>
          </View>

          {/* Time & Route Info */}
          <View style={styles.sectionBlock}>
            <View style={styles.dateTimeWrap}>
               <View style={styles.dateCol}>
                  <Ionicons name="calendar-outline" size={20} color={BLUE_ACCENT} />
                  <Text style={styles.dateTimeVal}>{new Date(trip.departureTime).toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
               </View>
               <View style={styles.dateLine} />
               <View style={styles.dateCol}>
                  <Ionicons name="time-outline" size={20} color={ORANGE_ACCENT} />
                  <Text style={styles.dateTimeVal}>{new Date(trip.departureTime).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</Text>
               </View>
            </View>

            <View style={styles.routeBox}>
              <View style={styles.routePipes}>
                 <View style={[styles.routeDot, { borderColor: BLUE_ACCENT }]} />
                 <View style={styles.routeLine} />
                 <View style={[styles.routeDot, { borderColor: ORANGE_ACCENT, backgroundColor: ORANGE_ACCENT }]} />
              </View>
              <View style={styles.routeTexts}>
                 {(trip as any).isPermanentRoute ? (
                   <>
                     <TouchableOpacity style={styles.routeItem} onPress={() => setShowWaypointPicker('pickup')}>
                        <Text style={styles.routeLabel}>نقطة الركوب (اضغط للتغيير)</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>{pickupWaypoint?.address || trip.startLocation.address}</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={styles.routeItem} onPress={() => setShowWaypointPicker('dropoff')}>
                        <Text style={styles.routeLabel}>نقطة النزول (اضغط للتغيير)</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>{dropoffWaypoint?.address || trip.endLocation.address}</Text>
                     </TouchableOpacity>
                   </>
                 ) : (
                   <>
                     <View style={styles.routeItem}>
                        <Text style={styles.routeLabel}>نقطة الانطلاق</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>{trip.startLocation.address}</Text>
                     </View>
                     <View style={styles.routeItem}>
                        <Text style={styles.routeLabel}>الوجهة</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>{trip.endLocation.address}</Text>
                     </View>
                   </>
                 )}
              </View>
            </View>
          </View>

          {/* Vehicle Info & Rules */}
          {!(trip as any).isPermanentRoute && (
          <View style={styles.sectionBlock}>
             <Text style={styles.sectionTitle}>تفاصيل المركبة</Text>
             <View style={styles.vehicleRow}>
                <Ionicons name="car-sport-outline" size={24} color="rgba(255,255,255,0.7)" />
                <View style={{marginLeft: 10, marginRight: 'auto'}}>
                   <Text style={styles.vehicleModel}>{trip.captain?.vehicle?.model || 'سيارة غير محددة'}</Text>
                   <Text style={styles.vehicleColor}>{trip.captain?.vehicle?.color || '----'}</Text>
                </View>
                <View style={styles.plateWrap}>
                   <Text style={styles.plateTxt}>{trip.captain?.vehicle?.plateNumber || '----'}</Text>
                </View>
             </View>

             <View style={styles.rulesRow}>
               <View style={styles.rulePill}>
                 <Ionicons name={trip.preferences.smokingAllowed ? "flame-outline" : "water-outline"} size={16} color="rgba(255,255,255,0.6)" />
                 <Text style={styles.ruleTxt}>{trip.preferences.smokingAllowed ? 'تدخين مسموح' : 'يمنع التدخين'}</Text>
               </View>
               <View style={styles.rulePill}>
                 <Ionicons name={trip.preferences.musicAllowed ? "musical-notes-outline" : "volume-mute-outline"} size={16} color="rgba(255,255,255,0.6)" />
                 <Text style={styles.ruleTxt}>{trip.preferences.musicAllowed ? 'موسيقى' : 'هدوء'}</Text>
               </View>
             </View>
          </View>
          )}

          {/* Permanent Route: Subscribed Captains Info */}
          {(trip as any).isPermanentRoute && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>الكباتن على هذا المسار</Text>
            {trip.subscribedCaptains?.filter((s: any) => s.status === 'active').map((sub: any, idx: number) => (
              <View key={idx} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 10,
                backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13,148,136,0.2)',
                  borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#14B8A6', fontSize: 18, fontWeight: '900' }}>
                    {sub.captain?.name?.charAt(0) || 'ك'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15, textAlign: 'right' }}>{sub.captain?.name}</Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                      {Number(sub.captain?.rating?.average ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>✅ كابتن</Text>
                </View>
              </View>
            ))}
            {(!trip.subscribedCaptains || trip.subscribedCaptains.filter((s: any) => s.status === 'active').length === 0) && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 16 }}>
                لا يوجد كباتن مشتركون بعد
              </Text>
            )}
          </View>
          )}

          {/* Seat Selection */}
          <View style={styles.sectionBlock}>
            <View style={styles.seatSelectHeader}>
              <Text style={styles.sectionTitle}>حدد المقاعد</Text>
              <Text style={styles.seatsLeftTxt}>{remaining} مقاعد متاحة</Text>
            </View>
            
            <View style={styles.stepperWrap}>
               <TouchableOpacity 
                 style={[styles.stepperBtn, seats <= 1 && { opacity: 0.3 }]} 
                 activeOpacity={0.7} 
                 onPress={() => seats > 1 && setSeats(s => s - 1)}
               >
                 <Ionicons name="remove" size={24} color="#FFF" />
               </TouchableOpacity>
               
               <View style={styles.stepperValWrap}>
                 <Text style={styles.stepperVal}>{seats}</Text>
               </View>
               
               <TouchableOpacity 
                 style={[styles.stepperBtn, seats >= remaining && { opacity: 0.3 }]} 
                 activeOpacity={0.7} 
                 onPress={() => seats < remaining && setSeats(s => s + 1)}
               >
                 <Ionicons name="add" size={24} color="#FFF" />
               </TouchableOpacity>
            </View>
          </View>

          {/* Payment Selection */}
          <View style={[styles.sectionBlock, { borderBottomWidth: 0 }]}>
            <Text style={styles.sectionTitle}>طريقة الدفع</Text>
            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
              <TouchableOpacity
                style={[styles.paymentBtn, paymentMethod === 'cash' && styles.paymentBtnActive]}
                onPress={() => setPaymentMethod('cash')}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.paymentBtnTxt, paymentMethod === 'cash' && { color: '#FFF' }]}>نقدي كاش</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentBtn, paymentMethod === 'wallet' && styles.paymentBtnActive]}
                onPress={() => setPaymentMethod('wallet')}
                activeOpacity={0.8}
              >
                <Ionicons name="wallet-outline" size={20} color={paymentMethod === 'wallet' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.paymentBtnTxt, paymentMethod === 'wallet' && { color: '#FFF' }]}>المحفظة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      <View style={styles.bottomBar}>
         <LinearGradient colors={['transparent', '#0F172A']} style={StyleSheet.absoluteFillObject} />
         <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>الإجمالي المستحق</Text>
            <Text style={styles.totalVal}>{(seats * trip.pricePerSeat).toFixed(2)} د.أ</Text>
         </View>
         
         {myBookingId ? (
           <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: '#EF4444' }, booking && { opacity: 0.7 }]} 
              activeOpacity={0.85}
              onPress={handleCancelBook}
              disabled={booking}
           >
             {booking ? (
                <ActivityIndicator color="#FFF" size="small" />
             ) : (
               <>
                  <Text style={styles.primaryBtnTxt}>إلغاء الحجز</Text>
                  <Ionicons name="close-circle-outline" size={20} color="#FFF" />
               </>
             )}
           </TouchableOpacity>
         ) : (
           <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: BLUE_ACCENT }, booking && { opacity: 0.7 }]} 
              activeOpacity={0.85}
              onPress={handleBook}
              disabled={booking || remaining < 1}
           >
             {booking ? (
                <ActivityIndicator color="#FFF" size="small" />
             ) : (
               <>
                  <Text style={styles.primaryBtnTxt}>{remaining > 0 ? 'تأكيد الحجز الآن' : 'تم اكتمال العدد'}</Text>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
               </>
             )}
           </TouchableOpacity>
         )}
      </View>
      {/* ── Waypoint Picker Modal ── */}
      <Modal visible={!!showWaypointPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.waypointModal}>
            <Text style={styles.modalTitle}>اختر المحطة</Text>
            <ScrollView style={{ maxHeight: height * 0.5 }}>
              {[trip.startLocation, ...(trip.waypoints || []), trip.endLocation].map((wp: any, i: number) => {
                const isSelected = (showWaypointPicker === 'pickup' && pickupWaypoint?.address === wp.address) || 
                                   (showWaypointPicker === 'dropoff' && dropoffWaypoint?.address === wp.address);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.wpItem, isSelected && { borderColor: BLUE_ACCENT, backgroundColor: 'rgba(59,130,246,0.1)' }]}
                    onPress={() => {
                      if (showWaypointPicker === 'pickup') setPickupWaypoint(wp);
                      if (showWaypointPicker === 'dropoff') setDropoffWaypoint(wp);
                      setShowWaypointPicker(null);
                    }}
                  >
                    <Ionicons name="location-outline" size={20} color={isSelected ? BLUE_ACCENT : '#FFF'} />
                    <Text style={[styles.wpTxt, isSelected && { color: BLUE_ACCENT, fontWeight: '800' }]}>{wp.address}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowWaypointPicker(null)}>
              <Text style={styles.modalCloseTxt}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  loadingWrap: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13, marginTop: 8 },
  backErrorBtn: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  backErrorTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  mapContainer: { height: height * 0.45, width: '100%', position: 'absolute', top: 0 },
  map: { flex: 1 },
  topMapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomMapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },

  markerPin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', ...SHADOWS.medium },
  markerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -2 },

  backBtnWrapper: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 45, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },

  scrollContent: { paddingBottom: 120 },
  spacer: { height: height * 0.35 }, // Push content down past the map

  sheetContainer: {
    minHeight: height * 0.65,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    overflow: 'hidden', padding: 24, paddingBottom: 60,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
  },
  glassHighlight: { position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  captainCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  captainCols: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: BLUE_ACCENT, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 20, fontWeight: '900', color: BLUE_ACCENT },
  captainName: { fontSize: 16, fontWeight: '900', color: '#FFF', textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingTxt: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  
  priceNum: { fontSize: 24, fontWeight: '900', color: BLUE_ACCENT },
  priceCur: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: 2 },

  sectionBlock: { marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  
  dateTimeWrap: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  dateCol: { flex: 1, alignItems: 'center', gap: 8 },
  dateLine: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  dateTimeVal: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  routeBox: { flexDirection: 'row-reverse' },
  routePipes: { width: 24, alignItems: 'center', paddingVertical: 6, marginLeft: 12 },
  routeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: '#1A1F3C' },
  routeLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  routeTexts: { flex: 1, gap: 20 },
  routeItem: { paddingBottom: 4 },
  routeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  routeAddress: { fontSize: 14, color: '#FFF', fontWeight: '800', textAlign: 'right', lineHeight: 22 },

  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#FFF', textAlign: 'right', marginBottom: 16 },
  vehicleRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  vehicleModel: { fontSize: 14, color: '#FFF', fontWeight: '800', textAlign: 'right' },
  vehicleColor: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textAlign: 'right', marginTop: 2 },
  plateWrap: { backgroundColor: '#FCD34D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  plateTxt: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  rulesRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  rulePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  ruleTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  seatSelectHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seatsLeftTxt: { fontSize: 13, color: BLUE_ACCENT, fontWeight: '800', backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  
  stepperWrap: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  stepperBtn: { paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.02)' },
  stepperValWrap: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingVertical: 16 },
  stepperVal: { fontSize: 24, fontWeight: '900', color: '#FFF' },

  paymentBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  paymentBtnActive: { backgroundColor: BLUE_ACCENT, borderColor: BLUE_ACCENT },
  paymentBtnTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 40,
    flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between'
  },
  totalWrap: { alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: 4 },
  totalVal: { fontSize: 26, fontWeight: '900', color: '#FFF' },

  primaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, paddingHorizontal: 32, borderRadius: 20, ...SHADOWS.medium },
  primaryBtnTxt: { fontSize: 16, fontWeight: '900', color: '#FFF' },
  cancelBtnTxt: { color: '#EF4444', fontSize: 16, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  waypointModal: { backgroundColor: '#1E293B', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  wpItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  wpTxt: { flex: 1, color: '#E2E8F0', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  modalCloseBtn: { marginTop: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, alignItems: 'center' },
  modalCloseTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});

export default TripDetailsScreen;
