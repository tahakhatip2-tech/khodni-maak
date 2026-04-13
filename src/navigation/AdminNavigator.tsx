import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import CreatePermanentRouteScreen from '../screens/admin/CreatePermanentRouteScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

const Stack = createStackNavigator();

const AdminNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="CreatePermanentRoute" component={CreatePermanentRouteScreen} />
    <Stack.Screen name="AdminProfile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;
