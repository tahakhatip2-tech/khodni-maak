import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { LocationProvider } from './src/context/LocationContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <LocationProvider>
          <SocketProvider>
            <NotificationProvider>
              <AppNavigator />
            </NotificationProvider>
          </SocketProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
