import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform, RefreshControl, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import { ChatRoom } from '../../types';

const { width } = Dimensions.get('window');
const TEAL   = '#0D9488';
const ORANGE = '#F97316';

const ConversationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const isCaptain = user?.role === 'captain' || user?.role === 'both';
  const ACCENT = isCaptain ? TEAL : ORANGE;

  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await messageService.getConversations();
      setChats(r.data.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, []);

  const totalUnread = chats.reduce((s, c) => s + (c.unreadCount || 0), 0);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60)    return 'الآن';
    if (diff < 3600)  return `${Math.floor(diff / 60)}د`;
    if (diff < 86400) return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ar', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: ChatRoom }) => {
    const hasUnread = item.unreadCount > 0;
    return (
      <TouchableOpacity
        style={[styles.card, hasUnread && { borderColor: ACCENT + '40', borderWidth: 1 }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Chat', {
          userId: item.userId, userName: item.userName,
          tripId: item.tripId, rideId: item.rideId
        })}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: ACCENT + '20', borderColor: hasUnread ? ACCENT : 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.avatarTxt, { color: ACCENT }]}>{item.userName?.charAt(0)}</Text>
          {hasUnread && <View style={[styles.activeDot, { backgroundColor: '#22C55E' }]} />}
        </View>

        {/* Content */}
        <View style={styles.contentWrap}>
          <View style={styles.topRow}>
            <Text style={styles.timeText}>{formatTime(item.lastMessageTime)}</Text>
            <Text style={[styles.nameText, hasUnread && { color: '#FFFFFF', fontWeight: '900' }]} numberOfLines={1}>
              {item.userName}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            {hasUnread ? (
              <View style={[styles.badge, { backgroundColor: ACCENT }]}>
                <Text style={styles.badgeTxt}>{item.unreadCount}</Text>
              </View>
            ) : (
              <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.3)" />
            )}
            <Text
              style={[styles.lastMsgText, hasUnread && { color: 'rgba(255,255,255,0.85)', fontWeight: '700' }]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.2)" style={{ marginRight: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full Navy background */}
      <LinearGradient
        colors={['#0F172A', '#1A1F3C', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Premium Header ── */}
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(15,23,42,0.98)', 'rgba(26,31,60,0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>المحادثات</Text>
            {totalUnread > 0 && (
              <View style={[styles.totalBadge, { backgroundColor: ACCENT }]}>
                <Text style={styles.totalBadgeTxt}>{totalUnread}</Text>
              </View>
            )}
          </View>

          <View style={[styles.filterBtn, { borderColor: ACCENT + '40' }]}>
            <Ionicons name="search-outline" size={18} color={ACCENT} />
          </View>
        </View>
      </View>

      {/* ── Stats Strip ── */}
      {chats.length > 0 && (
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: ACCENT }]}>{chats.length}</Text>
            <Text style={styles.statLabel}>محادثات</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#22C55E' }]}>{totalUnread}</Text>
            <Text style={styles.statLabel}>غير مقروءة</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: 'rgba(255,255,255,0.6)' }]}>#{chats.length}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
        </View>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>جاري تحميل المحادثات...</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={i => i.userId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCircle, { borderColor: ACCENT }]}>
                <Ionicons name="chatbubbles-outline" size={44} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد محادثات بعد</Text>
              <Text style={styles.emptyDesc}>
                {isCaptain
                  ? 'تواصل مع ركابك مباشرة من هنا بعد قبول أول رحلة'
                  : 'تواصل مع كابتنك مباشرة من هنا بعد حجز رحلتك'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  totalBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  totalBadgeTxt: { fontSize: 12, fontWeight: '900', color: '#FFF' },
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Loading
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },
  separator: { height: 8 },

  card: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },

  avatar: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarTxt: { fontSize: 20, fontWeight: '900' },
  activeDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#0F172A' },

  contentWrap: { flex: 1, justifyContent: 'center', gap: 6 },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  nameText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  timeText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },
  bottomRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  lastMsgText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'right' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { fontSize: 11, fontWeight: '900', color: '#FFF' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 16, paddingHorizontal: 40 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textAlign: 'center', lineHeight: 22 },
});

export default ConversationsScreen;
