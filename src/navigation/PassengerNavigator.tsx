import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS } from '../constants/theme';
import { useSocket } from '../context/SocketContext';

// Passenger Screens
import PassengerHomeScreen from '../screens/passenger/PassengerHomeScreen';
import SearchTripsScreen from '../screens/passenger/SearchTripsScreen';
import TripDetailsScreen from '../screens/passenger/TripDetailsScreen';
import BookingConfirmScreen from '../screens/passenger/BookingConfirmScreen';
import LiveTrackingScreen from '../screens/passenger/LiveTrackingScreen';
import MyBookingsScreen from '../screens/passenger/MyBookingsScreen';
import OnDemandRideScreen from '../screens/passenger/OnDemandRideScreen';
import OnDemandTrackingScreen from '../screens/passenger/OnDemandTrackingScreen';
import PermanentRoutesMapScreen from '../screens/passenger/PermanentRoutesMapScreen';
import RouteTrackingScreen from '../screens/passenger/RouteTrackingScreen';
import CreateSearchRequestScreen from '../screens/passenger/CreateSearchRequestScreen';

// Shared Screens
import ChatScreen from '../screens/shared/ChatScreen';
import ConversationsScreen from '../screens/shared/ConversationsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import SavedAddressesScreen from '../screens/shared/SavedAddressesScreen';
import RateTripScreen from '../screens/shared/RateTripScreen';
import PaymentScreen from '../screens/shared/PaymentScreen';

const BLUE_ACCENT = '#3B82F6';
const BLUE_LIGHT = '#60A5FA';
const ON_DEMAND_ACCENT = '#F97316';
const NAVY_DARK = '#0F172A';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Premium Custom Tab Bar ──────────────────────────────
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { unreadMessages } = useSocket();

  return (
    <View style={styles.tabBarContainer}>
      {/* Background with Blur */}
      <View style={[StyleSheet.absoluteFill, styles.tabBarBgWrapper]}>
        {Platform.OS === 'ios' ? (
          <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.95)' }]} />
        )}
        <View style={styles.tabBarBorder} />
      </View>

      <View style={styles.tabBarContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) { navigation.navigate(route.name); }
          };

          // Define Meta
          let iconName: any = 'home';
          let label = '';
          let isFab = false;
          let badge = 0;

          if (route.name === 'PassengerHome') { iconName = isFocused ? 'home' : 'home-outline'; label = 'الرئيسية'; }
          else if (route.name === 'SearchTrips') { iconName = isFocused ? 'search' : 'search-outline'; label = 'بحث'; }
          else if (route.name === 'OnDemand') { iconName = isFocused ? 'flash' : 'flash-outline'; isFab = true; }
          else if (route.name === 'MyBookings') { iconName = isFocused ? 'ticket' : 'ticket-outline'; label = 'تذاكري'; }
          else if (route.name === 'PassengerMessages') { iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline'; label = 'الرسائل'; badge = unreadMessages; }

          if (isFab) {
            return (
              <TouchableOpacity key={route.key} activeOpacity={0.8} onPress={onPress} style={styles.fabContainer}>
                <View style={[styles.fabInner, isFocused && styles.fabActive]}>
                  <Ionicons name={iconName} size={32} color="#FFF" />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={route.key} activeOpacity={0.6} onPress={onPress} style={styles.tabItem}>
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons name={iconName} size={isFocused ? 22 : 24} color={isFocused ? '#FFF' : 'rgba(255,255,255,0.4)'} />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                )}
              </View>
              {isFocused && <Text style={styles.tabLabel} numberOfLines={1}>{label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const PassengerTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="PassengerHome" component={PassengerHomeScreen} />
      <Tab.Screen name="SearchTrips" component={SearchTripsScreen} />
      <Tab.Screen name="OnDemand" component={OnDemandRideScreen} />
      <Tab.Screen name="MyBookings" component={MyBookingsScreen} />
      <Tab.Screen name="PassengerMessages" component={ConversationsScreen} />
    </Tab.Navigator>
  );
};

const PassengerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PassengerTabs" component={PassengerTabs} />
    <Stack.Screen name="PermanentRoutesMap" component={PermanentRoutesMapScreen} />
    <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
    <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
    <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
    {/* TASK-02: شاشة التتبع المباشر للرحلة الخاصة بعد قبول الكابتن */}
    <Stack.Screen name="OnDemandTracking" component={OnDemandTrackingScreen} />
    {/* TASK-07: شاشة تتبع المسار الثابت مع الخريطة الحية وبيانات الكباتن */}
    <Stack.Screen name="RouteTracking" component={RouteTrackingScreen} />
    <Stack.Screen name="CreateSearchRequest" component={CreateSearchRequestScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="PassengerProfileScreen" component={ProfileScreen} />
    <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="RateTrip" component={RateTripScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20, right: 20,
    height: 70,
    zIndex: 100,
  },
  tabBarBgWrapper: {
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: Platform.OS !== 'ios' ? 'rgba(15,23,42,0.95)' : 'transparent',
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16,
  },
  tabBarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  tabBarContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    paddingHorizontal: 10,
  },
  tabItem: {
    alignItems: 'center', justifyContent: 'center', width: 60, height: '100%'
  },
  iconWrap: { position: 'relative', padding: 8, borderRadius: 20, marginBottom: 2 },
  iconWrapActive: { 
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
    shadowColor: ON_DEMAND_ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 5
  },
  tabLabel: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  badge: {
    position: 'absolute', top: -2, right: -6,
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 16, height: 16,
    borderWidth: 1.5, borderColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  
  fabContainer: {
    top: -20,
    width: 70, height: 70,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 200,
  },
  fabInner: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: ON_DEMAND_ACCENT,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#0F172A',
    shadowColor: ON_DEMAND_ACCENT, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  fabActive: {
    backgroundColor: '#FB923C',
    transform: [{ scale: 1.05 }],
  }
});

export default PassengerNavigator;
