import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ── 1. Types & Context ── */

export type NotificationType = 'success' | 'alert' | 'message' | 'trip' | 'info';

interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  onPress?: () => void;
}

interface NotificationContextProps {
  showNotification: (title: string, body: string, type?: NotificationType, onPress?: () => void) => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  showNotification: () => {},
});

export const useAppNotification = () => useContext(NotificationContext);

/* ── 2. Helper Styles & Icons ── */

const TYPE_CONFIG = {
  success: { icon: 'checkmark-circle' as const,     c: '#22C55E' },
  alert:   { icon: 'warning' as const,              c: '#F59E0B' },
  message: { icon: 'chatbubbles' as const,          c: '#F97316' }, // Orange Passenger
  trip:    { icon: 'car-sport' as const,            c: '#0D9488' }, // Teal Captain
  info:    { icon: 'information-circle' as const,   c: '#3B82F6' },
};

/* ── 3. Provider Component ── */

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [currentNotif, setCurrentNotif] = useState<NotificationData | null>(null);
  
  // Animation value for sliding down from top
  const translateY = useRef(new Animated.Value(-150)).current;
  const insets = useSafeAreaInsets();

  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (title: string, body: string, type: NotificationType = 'info', onPress?: () => void) => {
    // Clear existing timeout if multiple triggers occur
    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    const id = Math.random().toString(36).substring(7);
    setCurrentNotif({ id, title, body, type, onPress });

    // Animate In (Spring)
    Animated.spring(translateY, {
      toValue: 0,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 4 seconds
    hideTimeout.current = setTimeout(() => {
      closeNotification();
    }, 4000);
  };

  const closeNotification = () => {
    // Animate Out
    Animated.timing(translateY, {
      toValue: -150,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setCurrentNotif(null);
    });
  };

  const handlePress = () => {
    if (currentNotif?.onPress) {
      currentNotif.onPress();
    }
    closeNotification();
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Floating Global Banner Overlay */}
      {currentNotif && (
        <Animated.View
          style={[
            styles.bannerContainer,
            { transform: [{ translateY }] },
            { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 40 : 0) + 10 }
          ]}
        >
          <TouchableOpacity 
            style={[styles.glassCard, { borderColor: TYPE_CONFIG[currentNotif.type].c }]}
            activeOpacity={0.9}
            onPress={handlePress}
          >
            {/* Glowing Accent Border Line */}
            <View style={[styles.glowBar, { backgroundColor: TYPE_CONFIG[currentNotif.type].c }]} />

            <View style={styles.cardContent}>
              <View style={[styles.iconBox, { backgroundColor: TYPE_CONFIG[currentNotif.type].c + '25' }]}>
                <Ionicons name={TYPE_CONFIG[currentNotif.type].icon} size={22} color={TYPE_CONFIG[currentNotif.type].c} />
              </View>
              
              <View style={styles.textWrap}>
                <Text style={styles.title}>{currentNotif.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{currentNotif.body}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    elevation: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(26,31,60,0.92)',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  glowBar: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 4,
  },
  cardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  textWrap: {
    flex: 1, gap: 4,
  },
  title: {
    fontSize: 15, fontWeight: '900', color: '#FFFFFF', textAlign: 'right',
  },
  body: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontWeight: '600', lineHeight: 20,
  },
});
