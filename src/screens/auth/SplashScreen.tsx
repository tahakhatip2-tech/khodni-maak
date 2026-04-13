import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, StatusBar,
  Animated, Easing, Image, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Animations
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const dotsAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    // Dots loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 2, duration: 500, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 3, duration: 500, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        if (!isAuthenticated) {
          navigation.replace('Onboarding');
        }
      }, 2400);
    }
  }, [isLoading, isAuthenticated]);

  const dotColor = (idx: number) =>
    dotsAnim.interpolate({
      inputRange: [idx - 0.5, idx, idx + 0.5],
      outputRange: ['rgba(255,255,255,0.25)', '#14B8A6', 'rgba(255,255,255,0.25)'],
      extrapolate: 'clamp',
    });

  const dotWidth = (idx: number) =>
    dotsAnim.interpolate({
      inputRange: [idx - 0.5, idx, idx + 0.5],
      outputRange: [8, 24, 8],
      extrapolate: 'clamp',
    });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Same 3D background as full auth flow ── */}
      <ImageBackground
        source={require('../../../assets/images/welcome_bg_3d.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(26,31,60,0.2)', 'rgba(26,31,60,0.7)', 'rgba(26,31,60,0.98)']}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      {/* ── Animated Logo Block ── */}
      <Animated.View style={[styles.logoBlock, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />

        <View style={styles.nameRow}>
          <Text style={styles.nameWhite}>Khodni</Text>
          <Text style={styles.nameOrange}>Maak</Text>
        </View>

        {/* Zigzag Journey Icon Row */}
        <View style={styles.journeyRow}>
          <Ionicons name="car-sport" size={24} color="#FFFFFF" />
          <Text style={styles.dashes}>- - - - </Text>
          <Ionicons name="chevron-forward" size={16} color="#14B8A6" style={{ marginLeft: -10 }} />
          <Ionicons name="location" size={24} color="#F97316" />
        </View>

        <Text style={styles.tagline}>رفيق طريقك، أينما وجهتك</Text>
      </Animated.View>

      {/* ── Loading Dots ── */}
      <View style={styles.dotsRow}>
        {[1, 2, 3].map(i => (
          <Animated.View
            key={i}
            style={[styles.dot, {
              backgroundColor: dotColor(i),
              width: dotWidth(i),
            }]}
          />
        ))}
      </View>

      {/* ── Footer ── */}
      <Text style={styles.footerText}>Made with 🤍 by Eng. Taha Al-Khatib</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1F3C', alignItems: 'center', justifyContent: 'center' },

  logoBlock: { alignItems: 'center', marginBottom: 60 },
  logoImage: { width: 130, height: 130, marginBottom: -8 },

  nameRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  nameWhite: { fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  nameOrange: { fontSize: 42, fontWeight: '900', color: '#F97316', letterSpacing: 1 },

  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  dashes: { color: 'rgba(255,255,255,0.5)', fontSize: 18, letterSpacing: 6, fontWeight: '900' },

  tagline: { color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: '700' },

  dotsRow: { flexDirection: 'row', gap: 8, position: 'absolute', bottom: 90 },
  dot: { height: 8, borderRadius: 4 },

  footerText: {
    position: 'absolute', bottom: 40,
    color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700'
  },
});

export default SplashScreen;
