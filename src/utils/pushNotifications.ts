import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { userService } from '../services/userService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
         token = (await Notifications.getExpoPushTokenAsync()).data;
      } else {
         token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
      
      console.log('[Push] Registration Token:', token);

      // Save token to backend 
      // Ensure this is called ONLY after the user is fully logged in
      if (token) {
        await userService.savePushToken(token);
        console.log('[Push] Token successfully saved to backend.');
      }
    } catch (error) {
      console.log('[Push] Error fetching Expo push token: ', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
