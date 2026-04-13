import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar, Animated, Easing, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/messageService';
import socketService from '../../services/socketService';
import { Message } from '../../types';

const { width } = Dimensions.get('window');

// Accent colours that adapt to the user's role context
const NAVY   = '#1A1F3C';
const TEAL   = '#0D9488';
const ORANGE = '#F97316';

const ChatScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { userId, userName, tripId, rideId } = route.params;
  const { user } = useAuth();
  const isCaptain = user?.role === 'captain' || user?.role === 'both';
  const ACCENT = isCaptain ? TEAL : ORANGE;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const listRef = useRef<FlatList>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const inputHeight = useRef(new Animated.Value(52)).current;

  // Typing bubble animation
  useEffect(() => {
    if (typing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [typing]);

  useEffect(() => {
    loadMessages();
    socketService.on('new_message', (msg: Message) => {
      if (msg.sender._id === userId || msg.receiver._id === userId) {
        setMessages(prev => [msg, ...prev]);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    });
    socketService.on('typing', () => setTyping(true));
    socketService.on('stop_typing', () => setTyping(false));
    return () => {
      socketService.off('new_message');
      socketService.off('typing');
      socketService.off('stop_typing');
    };
  }, []);

  const loadMessages = async () => {
    try {
      const res = await messageService.getMessages(userId, tripId, rideId);
      setMessages(res.data.data.reverse());
      await messageService.markAsRead(userId);
    } catch {}
    setLoading(false);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      const res = await messageService.sendMessage({
        receiverId: userId,
        content: msgText,
        tripId: tripId || undefined,
        rideId: rideId || undefined,
      });
      const newMsg = res.data.data;
      setMessages(prev => [newMsg, ...prev]);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'فشل في إرسال الرسالة';
      Alert.alert('خطأ', msg);
      setText(msgText); // Restore text so user can retry
    }
    setSending(false);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender._id === user?._id;
    const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.sender._id === user?._id);

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {/* Other person avatar */}
        {!isMe ? (
          showAvatar ? (
            <View style={[styles.avatarSmall, { backgroundColor: ACCENT + '25', borderColor: ACCENT }]}>
              <Text style={[styles.avatarSmallTxt, { color: ACCENT }]}>{userName?.charAt(0)}</Text>
            </View>
          ) : <View style={{ width: 36 }} />
        ) : null}

        <View style={[styles.bubbleWrap, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start', marginLeft: 8 }]}>
          <View style={[
            styles.bubble,
            isMe
              ? { backgroundColor: ACCENT, borderBottomRightRadius: 4 }
              : { backgroundColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }
          ]}>
            <Text style={[styles.bubbleText, isMe ? { color: '#FFFFFF' } : { color: 'rgba(255,255,255,0.92)' }]}>
              {item.content}
            </Text>
          </View>
          <View style={[styles.metaRow, isMe ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }]}>
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={12}
                color={item.isRead ? ACCENT : 'rgba(255,255,255,0.4)'}
                style={{ marginRight: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen dark Navy background */}
      <LinearGradient
        colors={['#0F172A', '#1A1F3C', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Premium Header ── */}
      <View style={[styles.header]}>
        <LinearGradient
          colors={['rgba(15,23,42,0.98)', 'rgba(26,31,60,0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <LinearGradient colors={ACCENT === TEAL ? [TEAL, '#065F46'] : [ORANGE, '#C2410C']} style={styles.headerAvatar}>
              <Text style={styles.headerAvatarTxt}>{(userName || '؟')?.charAt(0)?.toUpperCase()}</Text>
            </LinearGradient>
            <View>
              <Text style={styles.headerName}>{userName || 'محادثة'}</Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.onlineText}>{typing ? 'يكتب...' : 'نشط الآن'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.callBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={20} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages List ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>جاري جلب المحادثة...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item._id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { borderColor: ACCENT }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد رسائل بعد</Text>
              <Text style={styles.emptyDesc}>أرسل رسالتك الأولى للتواصل المباشر</Text>
            </View>
          }
          ListHeaderComponent={
            typing ? (
              <View style={styles.typingRow}>
                <View style={[styles.avatarSmall, { backgroundColor: ACCENT + '20', borderColor: ACCENT, marginLeft: 8 }]}>
                  <Text style={[styles.avatarSmallTxt, { color: ACCENT }]}>{userName?.charAt(0)}</Text>
                </View>
                <View style={[styles.typingBubble, { borderColor: ACCENT + '30' }]}>
                  {[0, 1, 2].map(i => (
                    <Animated.View
                      key={i}
                      style={[styles.typingDot, {
                        backgroundColor: ACCENT,
                        opacity: typingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3 + i * 0.2, 1 - i * 0.2]
                        })
                      }]}
                    />
                  ))}
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Input Bar ── */}
      <View style={styles.inputBar}>
        <LinearGradient
          colors={['rgba(15,23,42,0.97)', 'rgba(15,23,42,1)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.inputBarContent}>
          {/* Quick emoji button */}
          <TouchableOpacity style={styles.emojiBtn} activeOpacity={0.7}>
            <Ionicons name="happy-outline" size={22} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          {/* Text Input */}
          <View style={[styles.inputWrap, { borderColor: text.length > 0 ? ACCENT : 'rgba(255,255,255,0.12)' }]}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="اكتب رسالتك..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              textAlign="right"
              multiline
              maxLength={500}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? ACCENT : 'rgba(255,255,255,0.08)', borderColor: text.trim() ? ACCENT : 'rgba(255,255,255,0.1)' }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="send" size={18} color={text.trim() ? '#FFF' : 'rgba(255,255,255,0.3)'} style={{ transform: [{ scaleX: -1 }] }} />
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1, paddingHorizontal: 12 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  headerAvatarTxt: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  headerName: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  onlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '700' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  // Messages
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
  listContent: { padding: 16, gap: 4, paddingBottom: 20, flexGrow: 1, justifyContent: 'flex-end' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 },
  msgRowMe: { flexDirection: 'row' },
  msgRowOther: { flexDirection: 'row-reverse' },

  avatarSmall: { width: 33, height: 33, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarSmallTxt: { fontSize: 13, fontWeight: '900' },

  bubbleWrap: { maxWidth: width * 0.72 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginBottom: 3 },
  bubbleText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },

  metaRow: { alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  timeText: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '600', textAlign: 'center' },

  typingRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  typingBubble: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row-reverse', gap: 5, alignItems: 'center' },
  typingDot: { width: 7, height: 7, borderRadius: 4 },

  // Input Bar
  inputBar: { overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  inputBarContent: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  emojiBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  inputWrap: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, maxHeight: 120,
  },
  input: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});

export default ChatScreen;
