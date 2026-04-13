// ================================
// KHODNI MAAK — TypeScript Types
// ================================

// ─── User & Auth ───────────────────────────────
export interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: 'captain' | 'passenger' | 'both' | 'admin';
  rating: number;
  totalRatings: number;
  totalTrips: number;
  vehicle?: Vehicle;
  pushToken?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Vehicle {
  type: string;       // sedan, suv, van
  model: string;
  color: string;
  plateNumber: string;
  image?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Location ──────────────────────────────────
export interface Location {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SavedAddress {
  _id: string;
  label: string;     // 'home' | 'work' | 'other'
  icon: string;
  address: string;
  location: Location;
}

// ─── Trip (Carpooling Mode) ─────────────────────
export type TripType = 'to_work' | 'from_work' | 'round_trip' | 'one-way' | 'return' | 'scheduled_route';
export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type PassengerStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'waiting' | 'picked_up' | 'dropped_off';

export interface TripPassenger {
  _id: string;
  user: User;
  pickupLocation: Location;
  dropoffLocation: Location;
  seats: number;
  status: PassengerStatus;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  pickedUpAt?: string;
  droppedOffAt?: string;
}

export interface Trip {
  _id: string;
  captain: User;
  tripType: TripType;
  startLocation: Location;
  endLocation: Location;
  route: number[][];
  departureTime: string;
  estimatedArrivalTime: string;
  returnDepartureTime?: string;
  recurring: {
    enabled: boolean;
    days: string[];
    endDate?: string;
  };
  availableSeats: number;
  bookedSeats: number;
  remainingSeats: number;
  pricePerSeat: number;
  currency: string;
  status: TripStatus;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
    lastUpdated: string;
  };
  passengers: TripPassenger[];
  preferences: {
    smokingAllowed: boolean;
    petsAllowed: boolean;
    musicAllowed: boolean;
  };
  distance: number;
  duration: number;
  notes?: string;
  createdAt: string;
  // Permanent route extras
  waypoints?: Location[];
  subscribedCaptains?: any[];
  isPermanentRoute?: boolean;
}

export interface TripSearchParams {
  startLocation?: {
    coordinates: [number, number];
    address?: string;
  };
  endLocation?: {
    coordinates: [number, number];
    address?: string;
  };
  departureTime?: string;
  seats?: number;
  maxDistance?: number;
}

// ─── Booking ────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Booking {
  _id: string;
  trip: Trip;
  passenger: User;
  captain: User;
  pickupLocation: Location;
  dropoffLocation: Location;
  seatsBooked: number;
  status: BookingStatus;
  payment: {
    amount: number;
    currency: string;
    method: 'cash' | 'card' | 'wallet' | 'subscription';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    paidAt?: string;
    transactionId?: string;
  };
  specialRequests?: string;
  cancellationReason?: string;
  createdAt: string;
}

// ─── On-Demand Ride (NEW — Uber-style) ──────────
export type OnDemandStatus =
  | 'searching'         // راكب يبحث عن كابتن
  | 'captain_found'     // وجد الكابتن
  | 'accepted'          // الكابتن قَبِل
  | 'captain_arriving'  // الكابتن في الطريق
  | 'in_progress'       // الرحلة جارية
  | 'completed'         // انتهت
  | 'cancelled';        // ملغاة

export interface OnDemandRide {
  _id: string;
  passenger: User;
  captain?: User;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: OnDemandStatus;
  estimatedPrice: number;
  finalPrice?: number;
  currency: string;
  distance: number;
  duration: number;
  route?: number[][];
  captainLocation?: {
    coordinates: [number, number];
    lastUpdated: string;
  };
  requestedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  payment: {
    method: 'cash' | 'card' | 'wallet';
    status: 'pending' | 'completed';
  };
}

export interface OnDemandRequest {
  pickupLocation: Location;
  dropoffLocation: Location;
  paymentMethod: 'cash' | 'card' | 'wallet';
}

export interface NearbyCapt {
  _id: string;
  name: string;
  rating: number;
  vehicle: Vehicle;
  location: Coordinates;
  distanceKm: number;
  etaMinutes: number;
}

// ─── Message & Chat ──────────────────────────────
export interface Message {
  _id: string;
  sender: User;
  receiver: User;
  trip?: string;              // tripId if related to a trip
  rideId?: string;            // onDemandRideId if on-demand
  content: string;
  type: 'text' | 'location';
  isRead: boolean;
  createdAt: string;
}

export interface ChatRoom {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tripId?: string;
  rideId?: string;
}

// ─── Notification ────────────────────────────────
export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'trip_started'
  | 'trip_cancelled'
  | 'captain_nearby'
  | 'passenger_status_update'
  | 'new_message'
  | 'ride_request'          // NEW
  | 'ride_accepted'         // NEW
  | 'ride_arrived'          // NEW
  | 'ride_completed';       // NEW

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

// ─── Rating ──────────────────────────────────────
export interface Rating {
  _id: string;
  rater: User;
  rated: User;
  trip?: string;
  ride?: string;           // NEW: for on-demand
  rating: number;
  comment?: string;
  tags?: string[];         // ['punctual', 'friendly', 'clean_car']
  createdAt: string;
}

// ─── API Response ────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  totalPages?: number;
  currentPage?: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

// ─── Navigation Types ─────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  RoleSelect: undefined;
  VehicleSetup: undefined;
  CaptainTabs: undefined;
  PassengerTabs: undefined;
};

export type CaptainTabsParamList = {
  CaptainHome: undefined;
  CreateTrip: undefined;
  MyTrips: undefined;
  Messages: undefined;
  CaptainProfile: undefined;
};

export type PassengerTabsParamList = {
  PassengerHome: undefined;
  SearchTrips: undefined;
  MyBookings: undefined;
  Messages: undefined;
  PassengerProfile: undefined;
};

export type CaptainStackParamList = {
  CaptainHome: undefined;
  CreateTrip: undefined;
  MyTrips: undefined;
  TripManagement: { tripId: string };
  LiveManagement: { tripId: string };
  Earnings: undefined;
  CaptainProfile: undefined;
  Chat: { userId: string; userName: string; tripId?: string; rideId?: string };
  Notifications: undefined;
  SavedAddresses: undefined;
};

export type PassengerStackParamList = {
  PassengerHome: undefined;
  SearchTrips: { fromLocation?: Location; toLocation?: Location };
  TripDetails: { tripId: string };
  BookingConfirm: { bookingId: string };
  LiveTracking: { tripId?: string; rideId?: string };
  MyBookings: undefined;
  OnDemandRide: undefined;     // NEW
  RideSearch: undefined;       // NEW
  Chat: { userId: string; userName: string; tripId?: string; rideId?: string };
  Notifications: undefined;
  PassengerProfile: undefined;
  SavedAddresses: undefined;
  PermanentRoutesMap: undefined;
  RateTrip: { tripId?: string; rideId?: string; captainId: string };
};

// ─── Permanent Route ──────────────────────────────
export interface PermanentRoute {
  _id: string;
  name: string;
  startLocation: { type: 'Point'; coordinates: [number, number]; address: string };
  endLocation: { type: 'Point'; coordinates: [number, number]; address: string };
  waypoints?: { type: 'Point'; coordinates: [number, number]; address: string }[];
  schedule: {
    days: string[];
    departureTime: string;
    returnTime?: string;
  };
  pricePerSeat: number;
  availableSeats: number;
  bookedSeats: number;
  status: 'active' | 'suspended' | 'cancelled';
  captain?: any;
  createdAt: string;
}

