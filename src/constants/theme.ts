// ============================
// KHODNI MAAK — DESIGN SYSTEM
// ============================

export const COLORS = {
  // Primary Brand
  primary: '#1A1F3C',
  primaryDark: '#0F1228',
  primaryLight: '#2D3561',

  // Accent (Main Action Color)
  accent: '#00D4AA',
  accentDark: '#00A38A',
  accentLight: '#33DDBB',

  // On-Demand Ride Color (Uber-style)
  ride: '#FF6B35',
  rideDark: '#E55A25',
  rideLight: '#FF8C5A',

  // Semantic
  success: '#2ED573',
  warning: '#FFB800',
  danger: '#FF4757',
  info: '#2196F3',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F5',
  border: '#E8ECF0',
  divider: '#F0F2F5',

  // Text
  textPrimary: '#1A1F3C',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Map
  mapCaptain: '#00D4AA',
  mapPassenger: '#2196F3',
  mapPickup: '#2ED573',
  mapDropoff: '#FF4757',
  mapRoute: '#1A1F3C',
  mapRouteOnDemand: '#FF6B35',

  // Gradients (use with LinearGradient)
  gradientPrimary: ['#1A1F3C', '#2D3561'] as string[],
  gradientAccent: ['#00D4AA', '#00A3FF'] as string[],
  gradientRide: ['#FF6B35', '#FF4757'] as string[],
  gradientCard: ['#FFFFFF', '#F5F7FA'] as string[],
  gradientOverlay: ['rgba(26,31,60,0.0)', 'rgba(26,31,60,0.95)'] as string[],
};

export const FONTS = {
  // Size
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 22,
  xxl: 26,
  xxxl: 32,
  display: 40,

  // Weight (React Native uses strings)
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screen: 20,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#1A1F3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1A1F3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#1A1F3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  accent: {
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ride: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: { damping: 15, stiffness: 150 },
};

// Trip Type Colors
export const TRIP_TYPE_COLORS = {
  to_work: COLORS.accent,
  from_work: COLORS.primary,
  round_trip: COLORS.info,
  on_demand: COLORS.ride,       // NEW: On-demand ride
  scheduled: COLORS.success,
};

// Status Colors
export const STATUS_COLORS = {
  scheduled: COLORS.info,
  active: COLORS.success,
  completed: COLORS.textSecondary,
  cancelled: COLORS.danger,
  pending: COLORS.warning,
  confirmed: COLORS.success,
  rejected: COLORS.danger,
  searching: COLORS.ride,       // NEW: searching for captain
  accepted: COLORS.accent,      // NEW: captain accepted
};
