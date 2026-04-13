import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  Platform, KeyboardAvoidingView, TextInput, Dimensions, StatusBar, Animated, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ratingService } from '../../services/ratingService';

const { width } = Dimensions.get('window');

const TEAL   = '#0D9488';
const GREEN  = '#10B981';
const ORANGE = '#F97316';
const RED    = '#EF4444';
const GOLD   = '#F59E0B';

// Tags matching the backend enum
const POSITIVE_TAGS = [
  { id: 'punctual', label: 'وصل بالوقت', icon: 'time-outline' },
  { id: 'comfortable', label: 'مريح', icon: 'happy-outline' },
  { id: 'clean_vehicle', label: 'سيارة نظيفة', icon: 'car-outline' },
  { id: 'friendly', label: 'خيّر وودود', icon: 'hand-left-outline' },
  { id: 'safe_driver', label: 'قيادة آمنة', icon: 'shield-checkmark-outline' },
  { id: 'great_music', label: 'موسيقى رائعة', icon: 'musical-notes-outline' },
];

const NEGATIVE_TAGS = [
  { id: 'late', label: 'تأخير', icon: 'time-outline' },
  { id: 'unclean_vehicle', label: 'مركبة غير نظيفة', icon: 'trash-outline' },
  { id: 'rude', label: 'سلوك مزعج', icon: 'sad-outline' },
  { id: 'fast_driving', label: 'قيادة متهورة', icon: 'warning-outline' },
  { id: 'loud_music', label: 'موسيقى مزعجة', icon: 'volume-high-outline' },
];

const LABELS = ['مخيب للآمال', 'مقبول', 'جيد', 'ممتاز', 'رائع ومثالي! 🤩'];

const RateTripScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { tripId, rideId, captainId, captainName } = route.params;
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Star scale animations
  const starScales = [1, 2, 3, 4, 5].map(() => useRef(new Animated.Value(1)).current);

  const handleStarPress = (val: number) => {
    if (rating !== val) {
      setSelectedTags([]); // reset tags when switching between positive/negative thresholds
    }
    setRating(val);
    Animated.sequence([
      Animated.timing(starScales[val - 1], { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(starScales[val - 1], { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (rating === 0) return Alert.alert('', 'يرجى اختيار عدد النجوم لتقييم رحلتك');
    setSubmitting(true);
    try {
      await ratingService.submitRating({ 
        ratedUserId: captainId, 
        rating, 
        comment: comment.trim(), 
        tags: selectedTags, 
        tripId, 
        rideId 
      });
      setTimeout(() => {
        Alert.alert('شكراً لك! 🎉', 'تقييمك يساعدنا في تحسين جودة خدماتنا', [
          { text: 'تم', onPress: () => navigation.popToTop() }
        ]);
        setSubmitting(false);
      }, 500);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('خطأ', err?.response?.data?.message || 'فشل إرسال التقييم');
    }
  };

  const display = hovered || rating;
  const isPositive = rating >= 4;
  const currentTags = rating === 0 ? [] : isPositive ? POSITIVE_TAGS : NEGATIVE_TAGS;
  const themeColor = rating === 0 ? GOLD : isPositive ? GREEN : ORANGE;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#0F172A', '#1A1F3C', '#0F172A']} style={StyleSheet.absoluteFillObject} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <LinearGradient colors={['rgba(15,23,42,0.98)', 'rgba(26,31,60,0.95)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.skipBtn} activeOpacity={0.7} disabled={submitting}>
              <Text style={styles.skipTxt}>تخطي</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>قيّم رحلتك ⭐</Text>
            <View style={{ width: 60 }} />
          </View>
        </View>

        {/* ── Captain Avatar Block ── */}
        <View style={styles.captainBlock}>
          <View style={[styles.captainAvatar, { borderColor: themeColor }]}>
            <Text style={[styles.captainAvatarTxt, { color: themeColor }]}>{captainName?.charAt(0) || 'ك'}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={themeColor} style={styles.avatarTick} />
          <Text style={styles.captainName}>{captainName || 'الكابتن'}</Text>
          <Text style={styles.captainSub}>كيف كانت ركوبتك مع {captainName?.split(' ')[0] || 'الكابتن'}؟</Text>
        </View>

        {/* ── Star Rating ── */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(val => (
            <TouchableOpacity
              key={val}
              onPress={() => handleStarPress(val)}
              onPressIn={() => setHovered(val)}
              onPressOut={() => setHovered(0)}
              activeOpacity={0.9}
              disabled={submitting}
            >
              <Animated.View style={{ transform: [{ scale: starScales[val - 1] }] }}>
                <Ionicons
                  name={val <= display ? 'star' : 'star-outline'}
                  size={46}
                  color={val <= display ? GOLD : 'rgba(255,255,255,0.15)'}
                />
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        {display > 0 ? (
          <Text style={[styles.ratingLabel, { color: display >= 4 ? GREEN : display >= 3 ? ORANGE : RED }]}>
            {LABELS[display - 1]}
          </Text>
        ) : (
           <Text style={[styles.ratingLabel, { color: 'transparent' }]}>-</Text>
        )}

        {/* ── Experience Tags ── */}
        {rating > 0 && (
          <View style={styles.glassCard}>
            <View style={styles.glassHighlight} />
            <Text style={styles.sectionTitle}>{isPositive ? 'ما الذي نال إعجابك؟' : 'ما الذي يمكن إضافته أو تحسينه؟'}</Text>
            <View style={styles.tagsGrid}>
              {currentTags.map(tag => {
                const isSel = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip, 
                      { borderColor: isSel ? themeColor : 'rgba(255,255,255,0.1)' },
                      isSel && { backgroundColor: themeColor }
                    ]}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.8}
                    disabled={submitting}
                  >
                    <Ionicons name={tag.icon as any} size={15} color={isSel ? '#FFF' : 'rgba(255,255,255,0.5)'} style={{ marginLeft: 6 }} />
                    <Text style={[styles.tagText, { color: isSel ? '#FFF' : 'rgba(255,255,255,0.6)' }]}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Comment */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ملاحظات إضافية (اختياري)</Text>
            <View style={[styles.commentBox, { borderColor: comment.length > 0 ? themeColor : 'rgba(255,255,255,0.08)' }]}>
              <TextInput
                style={styles.commentInput}
                placeholder="شاركنا رأيك..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlign="right"
                maxLength={300}
                editable={!submitting}
              />
            </View>
          </View>
        )}

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: rating > 0 ? themeColor : 'rgba(255,255,255,0.05)' },
            rating === 0 && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
            submitting && { opacity: 0.7 }
          ]}
          onPress={handleSubmit}
          disabled={!rating || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
             <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
               <Ionicons name="send" size={18} color={rating > 0 ? '#FFF' : 'rgba(255,255,255,0.3)'} />
               <Text style={[styles.submitBtnText, { color: rating > 0 ? '#FFF' : 'rgba(255,255,255,0.3)' }]}>
                 إرسال التقييم
               </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { flexGrow: 1, paddingBottom: 50 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  skipBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  skipTxt: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '700' },

  captainBlock: { alignItems: 'center', paddingVertical: 32, position: 'relative' },
  captainAvatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  captainAvatarTxt: { fontSize: 38, fontWeight: '900' },
  avatarTick: { position: 'absolute', bottom: 65, right: width/2 - 40, backgroundColor: '#1A1F3C', borderRadius: 12, padding: 0 },
  captainName: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 16, marginBottom: 6 },
  captainSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  starsRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 12, marginBottom: 16 },
  ratingLabel: { textAlign: 'center', fontSize: 18, fontWeight: '900', marginBottom: 24, letterSpacing: 0.5 },

  glassCard: {
    marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 28, padding: 24, paddingTop: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden', marginBottom: 24,
  },
  glassHighlight: { position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', textAlign: 'right', marginBottom: 16 },

  tagsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  tagChip: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.02)' },
  tagText: { fontSize: 13, fontWeight: '700' },

  commentBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1.5, padding: 16, minHeight: 100 },
  commentInput: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', lineHeight: 22, textAlignVertical: 'top' },

  submitBtn: {
    marginHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', borderRadius: 20, height: 60, gap: 10,
    marginTop: 10
  },
  submitBtnText: { fontSize: 16, fontWeight: '900' },
});

export default RateTripScreen;
