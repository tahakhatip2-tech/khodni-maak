import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Platform, Dimensions } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { userService } from '../../services/userService';
import { SavedAddress } from '../../types';

const { width } = Dimensions.get('window');

const icons: Record<string, string> = { home: '🏠', work: '🏢', other: '📍' };

const SavedAddressesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  
  const load = async () => {
    try { 
      const r = await userService.getSavedAddresses(); 
      setAddresses(r.data.data); 
    } catch {}
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('حذف العنوان', 'هل أنت متأكد من رغبتك في إزالة هذا العنوان من قائمتك المفضلة؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await userService.deleteSavedAddress(id); load(); } }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Abstract Dynamic Header */}
      <View style={styles.headerHero}>
         <View style={styles.bgCircleTop} />
         <View style={styles.bgCircleBottom} />
         
         <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backText}>→</Text>
            </TouchableOpacity>
            <View style={styles.titleRow}>
               <Text style={styles.headerTitle}>العناوين المحفوظة</Text>
               <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountTxt}>{addresses.length}</Text>
               </View>
            </View>
         </View>
      </View>

      {/* Adding a new address button */}
      <View style={styles.actionContainer}>
         <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => { /* Navigate to add address map screen */ }}>
            <Text style={styles.addBtnText}>إضافة عنوان جديد</Text>
            <View style={styles.addIconWrap}>
               <Text style={styles.addIconTxt}>+</Text>
            </View>
         </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList 
          data={addresses} 
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
             <View style={styles.empty}>
               <View style={styles.emptyIconWrap}>
                 <Text style={styles.emptyEmoji}>📍</Text>
               </View>
               <Text style={styles.emptyTitle}>لا توجد عناوين محفوظة</Text>
               <Text style={styles.emptyText}>قم بإضافة الأماكن التي تتردد عليها باستمرار مثل المنزل أو العمل لسهولة اختيارها لاحقاً.</Text>
             </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              
              <View style={styles.cardContent}>
                {/* Icon area */}
                <View style={[styles.iconWrap, { backgroundColor: COLORS.primary + '15' }]}>
                  <Text style={{ fontSize: 24 }}>{icons[item.label] || icons.other}</Text>
                </View>
                
                {/* Info area */}
                <View style={styles.info}>
                  <Text style={styles.label}>{item.label === 'home' ? 'المنزل' : item.label === 'work' ? 'العمل' : item.label}</Text>
                  <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
                </View>
              </View>
              
              {/* Delete action */}
              <TouchableOpacity activeOpacity={0.6} onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>

            </View>
          )} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  headerHero: { 
    height: 140, width: '100%', backgroundColor: COLORS.primaryDark,
    paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    position: 'relative', overflow: 'hidden', ...SHADOWS.large, zIndex: 10
  },
  bgCircleTop: { position: 'absolute', top: -30, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  bgCircleBottom: { position: 'absolute', bottom: -50, left: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(0, 212, 170, 0.15)' },
  
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: SPACING.xl, justifyContent: 'space-between', flex: 1, paddingTop: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.white, fontSize: 20, fontWeight: FONTS.bold },
  
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: FONTS.extraBold, color: COLORS.white },
  badgeCount: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeCountTxt: { color: COLORS.white, fontSize: 12, fontWeight: FONTS.bold },

  actionContainer: { paddingHorizontal: SPACING.xl, marginTop: -24, zIndex: 15, alignItems: 'center' },
  addBtn: { 
     flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.white, 
     paddingHorizontal: SPACING.xl, paddingVertical: 12, borderRadius: RADIUS.full, gap: 12,
     ...SHADOWS.medium, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)'
  },
  addBtnText: { color: COLORS.primary, fontSize: FONTS.base, fontWeight: FONTS.bold },
  addIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  addIconTxt: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginTop: -2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, ...SHADOWS.medium },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: FONTS.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  list: { paddingHorizontal: SPACING.xl, paddingTop: 30, paddingBottom: 40, gap: SPACING.md },
  
  card: { 
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.base, 
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)', ...SHADOWS.small 
  },
  cardContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.md, flex: 1 },
  iconWrap: { width: 52, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, paddingRight: 4 },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, textAlign: 'right' },
  address: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4, lineHeight: 18 },
  
  deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  deleteIcon: { fontSize: 16 },
});

export default SavedAddressesScreen;
