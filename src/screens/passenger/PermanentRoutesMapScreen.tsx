import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { permanentRouteService } from '../../services/permanentRouteService';
import { useLocation } from '../../context/LocationContext';

const NAVY = '#0F172A';
const VIOLET = '#7C3AED';
const BLUE_LIGHT = '#60A5FA';
const { height } = Dimensions.get('window');

// Premium Dark Map Style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

const PermanentRoutesMapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { location } = useLocation();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const mapRef = useRef<MapView>(null);

  useFocusEffect(useCallback(() => { loadRoutes(); }, []));

  const loadRoutes = async () => {
    try {
      const res = await permanentRouteService.getRoutes('active');
      setRoutes(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  const centerMapToUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }, 1000);
    }
  };

  if (loading) return (
    <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={VIOLET} />
      <Text style={styles.loadingTxt}>جاري تحميل شبكة المسارات...</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: location?.latitude || 31.9522,
          longitude: location?.longitude || 35.9334,
          latitudeDelta: 0.1, longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        pitchEnabled={false}
      >
        {routes.map((route, idx) => {
          const isSelected = selectedRoute?._id === route._id;
          const color = isSelected ? VIOLET : 'rgba(124, 58, 237, 0.4)';
          const zIndex = isSelected ? 10 : 1;
          
          const coords = [
            { latitude: route.startLocation.coordinates[1], longitude: route.startLocation.coordinates[0] },
            ...(route.waypoints || []).map((wp: any) => ({ latitude: wp.coordinates?.[1] || 0, longitude: wp.coordinates?.[0] || 0 })).filter((c:any) => c.latitude !== 0),
            { latitude: route.endLocation.coordinates[1], longitude: route.endLocation.coordinates[0] }
          ];

          return (
            <React.Fragment key={route._id}>
              {/* Line connecting start, waypoints and end */}
              <Polyline 
                coordinates={coords}
                strokeColor={color}
                strokeWidth={isSelected ? 5 : 3}
                lineDashPattern={isSelected ? [] : [10, 10]}
                zIndex={zIndex}
                tappable={true}
                onPress={() => setSelectedRoute(route)}
              />

              {/* Start Marker */}
              <Marker
                coordinate={coords[0]}
                onPress={() => setSelectedRoute(route)}
                zIndex={zIndex + 1}
              >
                <View style={[styles.markerPin, { backgroundColor: color }]}>
                  <Ionicons name="bus" size={14} color="#FFF" />
                </View>
              </Marker>
              
              {/* End Marker */}
              <Marker
                coordinate={coords[coords.length - 1]}
                onPress={() => setSelectedRoute(route)}
                zIndex={zIndex + 1}
              >
                <View style={[styles.markerPin, { backgroundColor: '#F97316', width: 20, height: 20 }]}>
                   <View style={{ width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4 }} />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* ── Top Header Overlay ── */}
      <LinearGradient colors={['rgba(15,23,42,0.95)', 'transparent']} style={styles.topGradient} pointerEvents="none" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>شبكة المواصلات الدائمة</Text>
          <Text style={styles.headerSub}>{routes.length} مسارات فعّالة</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.myLocationBtn} activeOpacity={0.8} onPress={centerMapToUser}>
        <Ionicons name="locate" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* ── Bottom Sheet (Selected Route Details) ── */}
      {selectedRoute && (
        <View style={styles.bottomSheet}>
          <LinearGradient colors={['rgba(26,31,60,0.98)', '#0F172A']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.glassHighlight} />
          
          <View style={styles.sheetHeader}>
            <View style={styles.titleRow}>
              <View style={styles.busIconWrap}>
                <Ionicons name="bus" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.routeName}>{selectedRoute.name}</Text>
                <Text style={styles.routePrice}>{selectedRoute.pricePerSeat} د.أ للرحلة</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedRoute(null)}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.routeLineRow}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: BLUE_LIGHT }]} />
              <Text style={styles.routeAddr} numberOfLines={1}>{selectedRoute.startLocation.address}</Text>
            </View>
            <Ionicons name="arrow-down" size={14} color="rgba(255,255,255,0.2)" style={{ marginLeft: 3, marginVertical: 2 }} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
              <Text style={styles.routeAddr} numberOfLines={1}>{selectedRoute.endLocation.address}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoTxt}>{selectedRoute.departureTime}</Text>
            </View>
            <View style={styles.infoCol}>
              <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoTxt}>
                {selectedRoute.subscribedCaptains?.filter((c:any) => c.status === 'active').length} كباتن متاحين
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.bookBtn}
            activeOpacity={0.9}
            // Passing mapped properties so TripDetailsScreen understands it
            onPress={() => {
              navigation.navigate('TripDetails', {
                tripId: selectedRoute._id,
                isPermanentRoute: true
              });
            }}
          >
            <LinearGradient colors={[VIOLET, '#5B21B6']} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.bookBtnTxt}>تفاصيل إضافية وحجز</Text>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },
  loadingTxt: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontWeight: '700' },
  
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 1 },
  header: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 45, left: 20, right: 20,
    flexDirection: 'row-reverse', alignItems: 'center', zIndex: 2
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, marginRight: 16 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  headerSub: { color: VIOLET, fontSize: 13, fontWeight: '700', textAlign: 'right', marginTop: 2 },

  myLocationBtn: { position: 'absolute', right: 20, bottom: height * 0.35, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(15,23,42,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 2, elevation: 8 },

  markerPin: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 6 },
  
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden',
    padding: 24, zIndex: 10,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20
  },
  glassHighlight: { position: 'absolute', top: 0, left: '20%', right: '20%', height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  busIconWrap: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.5)', alignItems: 'center', justifyContent: 'center' },
  routeName: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  routePrice: { color: VIOLET, fontSize: 14, fontWeight: '800', textAlign: 'right', marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

  routeLineRow: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 16 },
  routePoint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeAddr: { color: '#E2E8F0', fontSize: 14, fontWeight: '700', textAlign: 'right', flex: 1 },

  infoGrid: { flexDirection: 'row-reverse', gap: 12, marginBottom: 24 },
  infoCol: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },

  bookBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 20, overflow: 'hidden', elevation: 8 },
  bookBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '900' }
});

export default PermanentRoutesMapScreen;
