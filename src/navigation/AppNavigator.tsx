import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

import { navigationRef } from './navigationRef';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import VehicleSetupScreen from '../screens/auth/VehicleSetupScreen';

// Captain & Passenger & Admin Tab Navigators
import CaptainNavigator from './CaptainNavigator';
import PassengerNavigator from './PassengerNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const isAdmin     = user?.role === 'admin';
  const isCaptain   = user?.role === 'captain' || user?.role === 'both';
  const isPassenger = user?.role === 'passenger' || user?.role === 'both';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // ── Auth Flow ──────────────────────────────────────
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
          </>
        ) : (
          // ── Main App Flow ───────────────────────────────────
          <>
            {isAdmin ? (
              <Stack.Screen name="AdminApp" component={AdminNavigator} />
            ) : isCaptain ? (
              <Stack.Screen name="CaptainApp" component={CaptainNavigator} />
            ) : (
              <Stack.Screen name="PassengerApp" component={PassengerNavigator} />
            )}
            {/* شاشات إضافية متاحة دائماً للتنقل */}
            {!isAdmin && !isCaptain && (
              <Stack.Screen name="CaptainApp" component={CaptainNavigator} />
            )}
            {!isAdmin && isCaptain && (
              <Stack.Screen name="PassengerApp" component={PassengerNavigator} />
            )}
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
});

export default AppNavigator;
