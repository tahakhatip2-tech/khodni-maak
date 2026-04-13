import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types';

const TEAL   = '#0D9488';
const ORANGE = '#F97316';

// Map notification type → icon name & colour
const TYPE_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  booking_confirmed: { icon: 'checkmark-circle',     color: '#22C55E' },
  booking_cancelled: { icon: 'close-circle',          color: '#EF4444' },
  trip_started:      { icon: 'navigate-circle',       color: '#3B82F6' },
  trip_cancelled:    { icon: 'ban',                   color: '#EF4444' },
  captain_nearby:    { icon: 'location',              color: ORANGE    },
  new_message:       { icon: 'chatbubble-ellipses',   color: '#8B5CF6' },
  ride_request:      { icon: 'flash',                 color: ORANGE    },
  ride_accepted:     { icon: 'car-sport',             color: TEAL      },
  ride_arrived:      { icon: 'flag',                  color: '#22C55E' },
  ride_completed:    { icon: 'trophy',                color: '#F59E0B' },
  default:           { icon: 'notifications',         color: '#64748B' },
};

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const isCaptain = user?.role === 'captain' || user?.role === 'both';
  const ACCENT = isCaptain ? TEAL : ORANGE;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data.data);
      await notificationService.markAllRead();
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return 'الآن';
    if (diff < 3600)  return `${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
    return d.toLocaleDateString('ar', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const meta = TYPE_MAP[item.type] || TYPE_MAP.default;
    return (
      <View style={[styles.card, !item.isRead && { borderColor: ACCENT + '40', borderWidth: 1 }]}>
        {/* Type Icon */}
        <View style={[styles.iconCircle, { backgroundColor: meta.color + '20', borderColor: meta.color + '40' }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: ACCENT }]} />}
        </View>

        {/* Text Content */}
        <View style={styles.textWrap}>
          <View style={styles.cardTopRow}>
            <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
            <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item._id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.25)" />
        </TouchableOpacity>
      </View>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0F172A', '#1A1F3C', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(15,23,42,0.98)', 'rgba(26,31,60,0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headingRow}>
            <Text style={styles.headerTitle}>الإشعارات</Text>
            {unreadCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: ACCENT }]}>
                <Text style={styles.countBadgeTxt}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={[styles.bellCircle, { borderColor: ACCENT + '40' }]}>
            <Ionicons name="notifications-outline" size={20} color={ACCENT} />
          </View>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>جاري جلب الإشعارات...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCircle, { borderColor: ACCENT }]}>
                <Ionicons name="notifications-off-outline" size={44} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إشعارات بعد</Text>
              <Text style={styles.emptyDesc}>عندما يكون هناك تحديثات لرحلاتك أو رسائل ستظهر إشعاراتك هنا.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  countBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  countBadgeTxt: { fontSize: 12, fontWeight: '900', color: '#FFF' },
  bellCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '700' },

  listContent: { padding: 16, flexGrow: 1 },

  card: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },

  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0
  },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#0F172A' },

  textWrap: { flex: 1, gap: 5 },
  cardTopRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  titleText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', flex: 1, textAlign: 'right' },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700', marginLeft: 8 },
  bodyText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'right', lineHeight: 18, fontWeight: '600' },

  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 16, paddingHorizontal: 40 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'center', lineHeight: 22 },
});

export default NotificationsScreen;
