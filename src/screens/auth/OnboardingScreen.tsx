import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ImageBackground, StatusBar, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {

  const navToRole = (role: string) => {
    // Navigate straight to Login but passing the context
    navigation.navigate('Login', { preselectedRole: role });
  };

  const navToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* 3D Premium Background containing App Name, Vehicle, and Locations */}
      <ImageBackground 
        source={require('../../../assets/images/welcome_bg_3d.png')} 
        style={styles.bgImage}
        resizeMode="cover"
      >
        {/* Gradient overlay to ensure text/buttons remain readable against 3D art */}
        <LinearGradient
          colors={['rgba(26, 31, 60, 0.1)', 'rgba(26, 31, 60, 0.4)', 'rgba(26, 31, 60, 0.95)']}
          style={styles.gradientOverlay}
        />

        <View style={styles.contentWrapper}>
          
          {/* Header Title Premium Typography */}
          {/* Header Title Premium Typography & Logo */}
          <View style={styles.headerTitles}>
             <Image 
                source={require('../../../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
             />

             {/* The App Name as subtext to support the Logo */}
             <View style={styles.titleRow}>
                <Text style={styles.titleEnWhite}>Khodni</Text>
                <Text style={styles.titleEnOrange}>Maak</Text>
             </View>

             <View style={styles.iconJourneyRow}>
                <Ionicons name="car-sport" size={28} color="#FFFFFF" style={styles.journeyIconDrop} />
                <View style={styles.squigglyWrap}>
                  <Text style={styles.squigglyDash}>- - - - </Text>
                  <Ionicons name="chevron-forward" size={18} color="#0D9488" style={{marginLeft: -10}} />
                </View>
                <Ionicons name="location" size={28} color="#F97316" style={styles.journeyIconDrop} />
             </View>
             
             <Text style={styles.subtitle}>رفيق طريقك، أينما وجهتك</Text>
          </View>

          {/* Premium Glassmorphism Modal */}
          <View style={styles.glassModal}>
            <View style={styles.glassHighlight} />
            
            <Text style={styles.modalHeading}>مرحباً بك في عالمنا</Text>
            <Text style={styles.modalSub}>اختر كيف ترغب ببدء رحلتك اليوم للحصول على تجربة مُخصصة بالكامل.</Text>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              
              {/* Captain Button - Green/Teal Outline */}
              <TouchableOpacity 
                style={[styles.roleBtn, { borderColor: '#14B8A6' }]} 
                activeOpacity={0.88}
                onPress={() => navToRole('captain')}
              >
                <View style={[styles.btnIconWrap, { backgroundColor: 'rgba(13, 148, 136, 0.2)' }]}>
                   <Ionicons name="car-sport" size={24} color="#14B8A6" />
                </View>
                <View style={styles.btnTextWrap}>
                   <Text style={[styles.btnTitle, { color: '#14B8A6' }]}>الدخول ككابتن</Text>
                   <Text style={styles.btnSub}>شارك مسارك واكسب إضافياً</Text>
                </View>
                <Ionicons name="chevron-back" size={24} color="#14B8A6" />
              </TouchableOpacity>

              {/* Passenger Button - Orange Outline */}
              <TouchableOpacity 
                style={[styles.roleBtn, { borderColor: '#FB923C' }]} 
                activeOpacity={0.88}
                onPress={() => navToRole('passenger')}
              >
                <View style={[styles.btnIconWrap, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                   <Ionicons name="person" size={22} color="#FB923C" />
                </View>
                <View style={styles.btnTextWrap}>
                   <Text style={[styles.btnTitle, { color: '#FB923C' }]}>الدخول كراكب</Text>
                   <Text style={styles.btnSub}>اطلب كابتنك الفوري الآن</Text>
                </View>
                <Ionicons name="chevron-back" size={24} color="#FB923C" />
              </TouchableOpacity>

              {/* Corporate Vision text inside the Modal */}
              <View style={styles.visionTextContainer}>
                <Text style={styles.visionTitle}>رؤيتنا 🌟</Text>
                <Text style={styles.visionBody}>
                  نبتكر لتسهيل يومك، لنضع مدينتك بين يديك برحلات ذكية، آمنة وموثوقة تواكب تطلعاتك.
                </Text>
              </View>

            </View>
          </View>

          {/* App Footer / Signature Engine */}
          <View style={styles.footerSignature}>
            <Text style={styles.versionText}>الإصدار 1.0.0 (BETA)</Text>
            <Text style={styles.signatureText}>Made with 🤍 by Eng. Taha Al-Khatib</Text>
          </View>
        </View>

      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1F3C' },
  bgImage: { flex: 1, width: width, height: height },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  
  contentWrapper: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: Platform.OS === 'ios' ? 60 : 50 },
  
  headerTitles: { alignItems: 'center', marginTop: 12 },
  
  logoImage: { width: 120, height: 120, marginBottom: -10 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.6, shadowRadius: 10 }, android: { elevation: 10 }}) },
  titleEnWhite: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  titleEnOrange: { fontSize: 36, fontWeight: '900', color: '#F97316', letterSpacing: 1 },

  iconJourneyRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  journeyIconDrop: { ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 4 }, android: { elevation: 6 } }) },
  squigglyWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  squigglyDash: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '900', letterSpacing: 6 },

  subtitle: { fontSize: 16, color: '#CBD5E1', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 6, marginTop: 8 },

  // Glassmorphism Modal
  glassModal: {
    backgroundColor: 'rgba(20, 25, 45, 0.6)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30 },
      android: { elevation: 10 }
    })
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  
  modalHeading: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#CBD5E1', textAlign: 'center', lineHeight: 22, fontWeight: '500', marginBottom: 24 },

  buttonsContainer: { gap: 16 },

  roleBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 24,
    borderWidth: 1.5, backgroundColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 2 }
    })
  },
  btnIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  btnTextWrap: { flex: 1, alignItems: 'flex-end', marginRight: 16 },
  btnTitle: { fontSize: 18, fontWeight: '900' },
  btnSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  visionTextContainer: { marginTop: 8, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
  visionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  visionBody: { color: '#CBD5E1', fontSize: 12, textAlign: 'center', lineHeight: 20, fontWeight: '600' },

  footerSignature: { alignItems: 'center', marginTop: -10, alignSelf: 'center' },
  versionText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  signatureText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold' }
});

export default WelcomeScreen;
