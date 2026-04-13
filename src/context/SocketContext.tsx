import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';
import { useAppNotification, NotificationType } from './NotificationContext';
import { navigate } from '../navigation/navigationRef';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadNotifications: number;
  unreadMessages: number;
  refreshUnreadCounts: () => Promise<void>;
  // On-demand: captain availability toggle
  setCaptainAvailable: (available: boolean, location?: number[]) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const { showNotification } = useAppNotification();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initSocket = async () => {
      const socket = await socketService.connect();
      socketRef.current = socket;
      setIsConnected(socket.connected);

      socket.on('connect', () => setIsConnected(true));
      socket.on('disconnect', () => setIsConnected(false));

      // Join user's private room immediately on connect
      if (user?._id) {
        socket.emit('join_user_room', { userId: user._id });
      }

      // ── Notification counter update ──────────────────
      socket.on('new_notification', (notif: Notification) => {
        setUnreadNotifications(prev => prev + 1);
        
        let type: NotificationType = 'info';
        if (notif.type.includes('success') || notif.type.includes('confirmed')) type = 'success';
        if (notif.type.includes('warn') || notif.type.includes('cancel')) type = 'alert';
        if (notif.type.includes('ride') || notif.type.includes('captain')) type = 'trip';
        
        let onPress: (() => void) | undefined = undefined;

        if (notif.type === 'ride_completed' || notif.type.includes('completed')) {
           onPress = () => navigate('RateTrip', { tripId: notif.data?.tripId, rideId: notif.data?.rideId });
        } else if (notif.type === 'ride_accepted') {
           onPress = () => navigate('LiveTracking', { rideId: notif.data?.rideId });
        } else if (notif.type === 'booking_confirmed') {
           onPress = () => navigate('MyBookings');
        } else if (notif.type === 'new_message') {
           onPress = () => navigate('Chat', { userId: notif.data?.senderId });
        } else if (notif.type === 'captain_nearby') {
           onPress = () => navigate('LiveTracking', { tripId: notif.data?.tripId });
        }

        showNotification(notif.title, notif.body, type, onPress);
      });

      // ── New message counter update ───────────────────
      socket.on('new_message', (msg: any) => {
        setUnreadMessages(prev => prev + 1);
        // Only show toast if the message is for the current user and we aren't currently viewing their chat
        showNotification('رسالة جديدة', 'لديك رسالة جديدة', 'message', () => {
             navigate('Chat', { userId: msg.sender?._id || msg.sender });
        });
      });

      // ── On-Demand: Incoming ride request (captain) ───
      socket.on('ride_request', (data: any) => {
        showNotification('طلب رحلة فوري!', 'راكب قريب منك يطلب توصيلة الآن', 'alert');
        // Handled by individual screens using socket.on()
      });

      // ── Scheduled Trip: New seat booking (captain) ──
      socket.on('new_booking', (data: any) => {
        showNotification(
          '🎉 حجز جديد على رحلتك!',
          `${data.passenger?.name || 'راكب'} حجز ${data.seatsBooked || 1} مقعد في رحلتك`,
          'success',
          () => navigate('TripManagement', { tripId: data.tripId })
        );
        setUnreadNotifications(prev => prev + 1);
      });

      // ── Permanent Route: New booking notification (captain) ──
      socket.on('route:new_booking', (data: any) => {
        showNotification(
          '🚌 حجز جديد على مسارك!',
          `${data.passenger?.name || 'راكب'} حجز ${data.seatsBooked || 1} مقعد على مسار "${data.routeName}"`,
          'success',
          () => navigate('RouteBookings', { routeId: data.routeId, routeName: data.routeName })
        );
        setUnreadNotifications(prev => prev + 1);
      });

      // ── Passenger: booking confirmed on scheduled trip ──
      socket.on('booking_confirmed', (data: any) => {
        showNotification(
          'تم تأكيد حجزك! 🎉',
          data.message || 'تم تأكيد حجزك بنجاح. الكابتن في انتظارك.',
          'success',
          () => navigate('MyBookings')
        );
        setUnreadNotifications(prev => prev + 1);
      });

      // ── Passenger: captain accepted on-demand ride ──
      socket.on('ride_accepted', (data: any) => {
        showNotification(
          'كابتن وصل! رحلتك تبدأ قريباً ✨',
          `${data.captain?.name || 'الكابتن'} قبل طلبك وفي الطريق إليك.`,
          'trip',
          () => navigate('LiveTracking', { rideId: data._id })
        );
        setUnreadNotifications(prev => prev + 1);
      });

      // ── Passenger: captain arrived at pickup ──
      socket.on('captain_arrived', () => {
        showNotification(
          'الكابتن وصل! 🚗',
          'الكابتن بانتظارك عند موقع الالتقاء، اخرج الآن!',
          'alert'
        );
      });

      // ── Both: ride/trip started ──
      socket.on('ride_started', () => {
        showNotification(
          'الرحلة بدأت! 🏁',
          'انطلقنا، استرخ واستمتع بالرحلة.',
          'trip'
        );
      });

      // ── Both: ride/trip completed ──
      socket.on('ride_completed', (data: any) => {
        showNotification(
          'تمت الرحلة بنجاح! ⭐',
          'يسعدنا تقييمك لتحسين خدمتنا.',
          'success',
          () => navigate('RateTrip', { rideId: data?._id })
        );
        setUnreadNotifications(prev => prev + 1);
      });
    };

    initSocket();
    refreshUnreadCounts();

    return () => {
      socketRef.current?.off('connect');
      socketRef.current?.off('disconnect');
      socketRef.current?.off('new_notification');
      socketRef.current?.off('new_message');
      socketRef.current?.off('ride_request');
      socketRef.current?.off('new_booking');
      socketRef.current?.off('route:new_booking');
      socketRef.current?.off('booking_confirmed');
      socketRef.current?.off('ride_accepted');
      socketRef.current?.off('captain_arrived');
      socketRef.current?.off('ride_started');
      socketRef.current?.off('ride_completed');
    };
  }, [isAuthenticated, user]);

  const refreshUnreadCounts = async () => {
    try {
      const [notifRes, msgRes] = await Promise.all([
        notificationService.getUnreadCount(),
        import('../services/messageService').then(m => m.messageService.getUnreadCount()),
      ]);
      setUnreadNotifications(notifRes.data.data.count);
      setUnreadMessages(msgRes.data.data.count);
    } catch {}
  };

  const setCaptainAvailable = (available: boolean, location?: number[]) => {
    socketService.setCaptainAvailable(available, location);
    // Also send userId so backend tracks which captain is available
    if (available && user?._id) {
      socketService.emit('captain_availability', { available: true, userId: user._id });
    } else {
      socketService.emit('captain_availability', { available: false });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      unreadNotifications,
      unreadMessages,
      refreshUnreadCounts,
      setCaptainAvailable,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
