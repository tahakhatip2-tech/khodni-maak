import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, StatusBar, Dimensions, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const TEAL   = '#0D9488';
const ORANGE = '#F97316';

interface PaymentMethod {
  id: string;
  type: 'cash' | 'card';
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', type: 'cash', title: 'دفع نقدي (كاش)', icon: 'cash-outline' },
  { id: '2', type: 'card', title: 'بطاقة ائتمانية (قريباً)', icon: 'card-outline', disabled: true },
];

const PaymentScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  // Destructure trip details (fallback to mock data if not passed)
  const { 
    tripId = 'TRP-' + Math.floor(Math.random() * 10000), 
    rideId = '', 
    captainId = '', 
    captainName = 'الكابتن',
    fare = 25.5, 
    distance = '12 كم', 
    duration = '24 دقيقة' 
  } = route.params || {};

  const { user } = useAuth();
  const isCaptain = user?.role === 'captain' || user?.role === 'both';
  const ACCENT = isCaptain ? TEAL : ORANGE;

  const [selectedMethod, setSelectedMethod] = useState<string>('1');
  const [loading, setLoading] = useState(false);

  const handlePayment = () => {
    setLoading(true);

    // Simulate API call to mark trip as paid
    setTimeout(() => {
      setLoading(false);
      Alert.alert('تم الدفع بنجاح! 🎉', 'نشكرك على استخدام خدني معاك. نتمنى لك يوماً سعيداً.', [
        { 
          text: 'قيّم الرحلة', 
          onPress: () => navigation.replace('RateTrip', { tripId, rideId, captainId, captainName }) 
        }
      ]);
    }, 1500);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Dark Navy Background */}
      <LinearGradient
        colors={['#0F172A', '#1A1F3C', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إتمام الدفع 💳</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Glass Receipt ── */}
        <View style={styles.receiptCard}>
          <View style={styles.glassHighlight} />
          
          <View style={styles.receiptHeader}>
            <View style={[styles.iconCircle, { backgroundColor: ACCENT + '20' }]}>
              <Ionicons name="receipt-outline" size={28} color={ACCENT} />
            </View>
            <Text style={styles.receiptSub}>فاتورة الرحلة</Text>
            <Text style={[styles.receiptTotal, { color: ACCENT }]}>{fare.toFixed(2)} د.أ</Text>
            <Text style={styles.receiptId}>{tripId}</Text>
          </View>

          <View style={styles.dottedLine} />

          {/* Details Row */}
          <View style={styles.detailsRow}>
            <View style={styles.detailBox}>
              <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.detailValue}>{duration}</Text>
              <Text style={styles.detailLabel}>المدة</Text>
            </View>
            
            <View style={styles.verticalDivider} />

            <View style={styles.detailBox}>
              <Ionicons name="map-outline" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.detailValue}>{distance}</Text>
              <Text style={styles.detailLabel}>المسافة</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.detailBox}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.detailValue} numberOfLines={1}>{captainName}</Text>
              <Text style={styles.detailLabel}>مع</Text>
            </View>
          </View>

        </View>

        {/* ── Payment Methods ── */}
        <Text style={styles.sectionTitle}>اختر طريقة الدفع</Text>
        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  isSelected && { borderColor: ACCENT, backgroundColor: ACCENT + '15' },
                  method.disabled && { opacity: 0.4 }
                ]}
                onPress={() => !method.disabled && setSelectedMethod(method.id)}
                activeOpacity={0.8}
                disabled={method.disabled}
              >
                {/* Method Info */}
                <View style={styles.methodInfo}>
                  <View style={[styles.methodIconWrap, { backgroundColor: isSelected ? ACCENT : 'rgba(255,255,255,0.06)' }]}>
                    <Ionicons name={method.icon} size={20} color={isSelected ? '#FFF' : 'rgba(255,255,255,0.6)'} />
                  </View>
                  <Text style={[styles.methodTitle, isSelected && { color: ACCENT, fontWeight: '800' }]}>{method.title}</Text>
                </View>

                {/* Radio Button */}
                <View style={[styles.radioCircle, isSelected && { borderColor: ACCENT }]}>
                  {isSelected && <View style={[styles.radioDot, { backgroundColor: ACCENT }]} />}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* ── Bottom Floating Action ── */}
      <View style={styles.bottomWrap}>
        <LinearGradient colors={['transparent', '#0F172A']} style={StyleSheet.absoluteFillObject} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>المجموع النهائي</Text>
          <Text style={styles.totalAmount}>{fare.toFixed(2)} د.أ</Text>
        </View>

        <TouchableOpacity 
          style={[styles.payBtn, { borderColor: ACCENT }, loading && { opacity: 0.7 }]} 
          onPress={handlePayment}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Text style={[styles.payBtnTxt, { color: ACCENT }]}>جاري معالجة الدفع...</Text>
          ) : (
            <>
              <Text style={[styles.payBtnTxt, { color: ACCENT }]}>تأكيد الدفع</Text>
              <Ionicons name="checkmark-circle-outline" size={24} color={ACCENT} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 150 },

  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },

  // Receipt
  receiptCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', padding: 24, marginBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 8 }
    })
  },
  glassHighlight: { position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  
  receiptHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  receiptSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 4 },
  receiptTotal: { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  receiptId: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginTop: 4, letterSpacing: 1 },

  dottedLine: { height: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', marginVertical: 20 },

  detailsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  detailBox: { flex: 1, alignItems: 'center', gap: 6 },
  detailValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  detailLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  verticalDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Methods
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', textAlign: 'right', marginBottom: 16 },
  methodsContainer: { gap: 12 },
  methodCard: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)'
  },
  methodInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  methodIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  // Bottom action
  bottomWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 40,
  },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, paddingHorizontal: 4 },
  totalLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  totalAmount: { fontSize: 24, color: '#FFFFFF', fontWeight: '900' },
  
  payBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, borderWidth: 1.5, height: 60, backgroundColor: 'transparent', gap: 10
  },
  payBtnTxt: { fontSize: 18, fontWeight: '900' }
});

export default PaymentScreen;
