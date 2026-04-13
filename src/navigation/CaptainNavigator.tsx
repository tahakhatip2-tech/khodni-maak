import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';
import { useSocket } from '../context/SocketContext';

const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const NAVY_DARK = '#0F172A';

// Captain Screens
import CaptainHomeScreen from '../screens/captain/CaptainHomeScreen';
import CreateTripScreen from '../screens/captain/CreateTripScreen';
import MyTripsScreen from '../screens/captain/MyTripsScreen';
import TripManagementScreen from '../screens/captain/TripManagementScreen';
import LiveManagementScreen from '../screens/captain/LiveManagementScreen';
import OnDemandManagementScreen from '../screens/captain/OnDemandManagementScreen';
import AvailableRequestsScreen from '../screens/captain/AvailableRequestsScreen';
import EarningsScreen from '../screens/captain/EarningsScreen';
import CaptainRoutesScreen from '../screens/captain/CaptainRoutesScreen';
import RouteBookingsScreen from '../screens/captain/RouteBookingsScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ConversationsScreen from '../screens/shared/ConversationsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import SavedAddressesScreen from '../screens/shared/SavedAddressesScreen';
import RateTripScreen from '../screens/shared/RateTripScreen';
import PaymentScreen from '../screens/shared/PaymentScreen';

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

          if (route.name === 'CaptainHome') { iconName = isFocused ? 'home' : 'home-outline'; label = 'الرئيسية'; }
          else if (route.name === 'MyTrips') { iconName = isFocused ? 'car' : 'car-outline'; label = 'رحلاتي'; }
          else if (route.name === 'CreateTrip') { iconName = 'add'; isFab = true; }
          else if (route.name === 'Messages') { iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline'; label = 'الرسائل'; badge = unreadMessages; }
          else if (route.name === 'CaptainRoutes') { iconName = isFocused ? 'bus' : 'bus-outline'; label = 'المسارات'; }

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

// ── Captain Stack (for screens outside tabs) ────────
const CaptainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CaptainTabs" component={CaptainTabs} />
    <Stack.Screen name="TripManagement" component={TripManagementScreen} />
    <Stack.Screen name="LiveManagement" component={LiveManagementScreen} />
    {/* TASK-03: شاشة إدارة الرحلة الخاصة للكابتن — الوصول → البدء → الإنهاء */}
    <Stack.Screen name="OnDemandManagement" component={OnDemandManagementScreen} />
    {/* شاشة الطلبات المتاحة — الكابتن يختار طلبات الركاب ويوافق عليها */}
    <Stack.Screen name="AvailableRequests" component={AvailableRequestsScreen} />
    <Stack.Screen name="Earnings" component={EarningsScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="CaptainProfileScreen" component={ProfileScreen} />
    <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="RateTrip" component={RateTripScreen} />
    <Stack.Screen name="RouteBookings" component={RouteBookingsScreen} />
  </Stack.Navigator>
);

// ── Captain Bottom Tabs ─────────────────────────────
const CaptainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="CaptainHome" component={CaptainHomeScreen} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} />
      <Tab.Screen name="CreateTrip" component={CreateTripScreen} />
      <Tab.Screen name="Messages" component={ConversationsScreen} />
      <Tab.Screen name="CaptainRoutes" component={CaptainRoutesScreen} />
    </Tab.Navigator>
  );
};

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
    borderColor: 'rgba(20,184,166,0.25)',
  },
  tabBarContent: {
    flexDirection: 'row-reverse', // Arabic Layout
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
    backgroundColor: 'rgba(20,184,166,0.15)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 4 },
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
    backgroundColor: TEAL,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#0F172A',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  fabActive: {
    backgroundColor: TEAL_LIGHT,
    transform: [{ scale: 1.05 }],
  }
});

export default CaptainStack;
