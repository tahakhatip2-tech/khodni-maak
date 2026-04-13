import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Dimensions,
  ActivityIndicator, Animated, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SHADOWS } from '../constants/theme';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

const NAVY = '#0F172A';
const BLUE_ACCENT = '#3B82F6';

type RatingTag = {
  id: string;
  label: string;
  icon: string;
};

// Positive Tags
const POSITIVE_TAGS: RatingTag[] = [
  { id: 'clean_vehicle', label: 'سيارة نظيفة', icon: 'car-sport-outline' },
  { id: 'safe_driver', label: 'قيادة آمنة', icon: 'shield-checkmark-outline' },
  { id: 'friendly', label: 'سلوك ودود', icon: 'happy-outline' },
  { id: 'punctual', label: 'وصل بالوقت', icon: 'time-outline' },
  { id: 'great_music', label: 'موسيقى رائعة', icon: 'musical-notes-outline' },
  { id: 'good_conversation', label: 'محادثة ممتعة', icon: 'chatbubbles-outline' },
];

// Negative Tags
const NEGATIVE_TAGS: RatingTag[] = [
  { id: 'late', label: 'تأخير', icon: 'time-outline' },
  { id: 'fast_driving', label: 'قيادة سريعة', icon: 'warning-outline' },
  { id: 'unclean_vehicle', label: 'غير نظيفة', icon: 'trash-outline' },
  { id: 'rude', label: 'سلوك مزعج', icon: 'sad-outline' },
  { id: 'loud_music', label: 'موسيقى صاخبة', icon: 'volume-high-outline' },
];

// 5 Confetti colors
const CONFETTI_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface RatingModalProps {
  visible: boolean;
  tripId: string;
  bookingId: string;
  targetUser: any; // The captain or passenger to be rated
  isCaptain: boolean; // Is the person rating a captain?
  onClose: () => void;
  onSuccess: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible, tripId, bookingId, targetUser, isCaptain, onClose, onSuccess
}) => {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const slideAnim = useState(new Animated.Value(height))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true
      }).start();
      setTimeout(() => {
        // Reset states
        setRating(0);
        setSelectedTags([]);
        setReview('');
      }, 300);
    }
  }, [visible]);

  const toggleTag = (id: string) => {
    if (selectedTags.includes(id)) {
      setSelectedTags(prev => prev.filter(t => t !== id));
    } else {
      setSelectedTags(prev => [...prev, id]);
    }
  };

  const submitRating = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await api.post('/ratings', {
        tripId,
        bookingId,
        ratedUserId: targetUser._id,
        rating,
        tags: selectedTags,
        review: review.trim() || undefined
      });
      onSuccess();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'تعذر إرسال التقييم');
    }
    setLoading(false);
  };

  if (!visible) return null;

  const currentTags = rating === 5 || rating === 4 ? POSITIVE_TAGS : rating > 0 ? NEGATIVE_TAGS : [];
  const buttonColor = rating === 0 ? 'rgba(255,255,255,0.1)' : rating < 4 ? '#F97316' : '#10B981';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Background Blur */}
        {Platform.OS === 'ios' ? (
           <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
        ) : (
           <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        )}

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={['#1e293b', '#0F172A']} style={StyleSheet.absoluteFillObject} />

            {/* Header / Avatar */}
            <View style={styles.header}>
              <View style={styles.avatarWrap}>
                {targetUser?.avatar ? (
                  <Image source={{ uri: targetUser.avatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarTxt}>{targetUser?.name?.charAt(0) || 'ش'}</Text>
                )}
                <View style={styles.checkmarkBadge}>
                  <Ionicons name="checkmark-sharp" size={12} color="#FFF" />
                </View>
              </View>
              <Text style={styles.title}>كيف كانت رحلتك مع {targetUser?.name?.split(' ')[0]}؟</Text>
              <Text style={styles.subtitle}>تقييمك يساعدنا في تحسين مجتمع "خذني معك"</Text>
            </View>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                  <Animated.View style={{ transform: [{ scale: rating === s ? 1.2 : 1 }] }}>
                    <Ionicons 
                      name={rating >= s ? 'star' : 'star-outline'} 
                      size={42} 
                      color={rating >= s ? '#F59E0B' : 'rgba(255,255,255,0.2)'} 
                      style={styles.starIcon} 
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags (Conditional) */}
            {rating > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsTitle}>
                  {rating >= 4 ? 'ما الذي نال إعجابك؟' : 'ما الذي يمكن إضافته أو تحسينه؟'}
                </Text>
                <View style={styles.tagsGrid}>
                  {currentTags.map(tag => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <TouchableOpacity 
                        key={tag.id} 
                        style={[styles.tagPill, active && { backgroundColor: rating >= 4 ? '#10B981' : '#F97316', borderColor: 'transparent' }]}
                        onPress={() => toggleTag(tag.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={tag.icon as any} size={16} color={active ? '#FFF' : 'rgba(255,255,255,0.6)'} />
                        <Text style={[styles.tagTxt, active && { color: '#FFF' }]}>{tag.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Review Input */}
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="أضف تعليقك (اختياري)..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={400}
                value={review}
                onChangeText={setReview}
              />
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
               <TouchableOpacity style={styles.skipBtn} onPress={onClose} disabled={loading}>
                 <Text style={styles.skipTxt}>تخطي</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[styles.submitBtn, { backgroundColor: buttonColor }]}
                 disabled={rating === 0 || loading}
                 onPress={submitRating}
               >
                 {loading ? <ActivityIndicator color="#FFF" /> : (
                   <Text style={[styles.submitTxt, rating > 0 && { color: '#FFF' }]}>إرسال التقييم</Text>
                 )}
               </TouchableOpacity>
            </View>

          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1, 
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: NAVY,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...SHADOWS.large,
    overflow: 'hidden'
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 2,
    borderColor: BLUE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 36 },
  avatarTxt: { fontSize: 32, fontWeight: '900', color: BLUE_ACCENT },
  checkmarkBadge: {
    position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10B981',
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: NAVY
  },
  title: { fontSize: 20, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  
  starsRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 12, marginBottom: 32 },
  starIcon: { marginHorizontal: 4 },

  tagsContainer: { marginBottom: 24 },
  tagsTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 16 },
  tagsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tagPill: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  tagTxt: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  inputWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 16, marginBottom: 24, minHeight: 100
  },
  input: { color: '#FFF', fontSize: 14, textAlign: 'right', textAlignVertical: 'top' },

  actionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16 },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14 },
  skipTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  submitBtn: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '800' }
});

export default RatingModal;
