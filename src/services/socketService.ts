import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────
// Socket Service — Real-time WebSocket connection
// ─────────────────────────────────────────────────────

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://192.168.42.208:5000';

class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) return this.socket;

    const token = await AsyncStorage.getItem('token');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // ── Rooms ──────────────────────────────────────
  joinUserRoom(userId: string) {
    this.socket?.emit('join_user_room', { userId });
  }

  joinTripRoom(tripId: string) {
    this.socket?.emit('join_trip_room', { tripId });
  }

  leaveTripRoom(tripId: string) {
    this.socket?.emit('leave_trip_room', { tripId });
  }

  joinRideRoom(rideId: string) {
    this.socket?.emit('join_ride_room', { rideId });
  }

  leaveRideRoom(rideId: string) {
    this.socket?.emit('leave_ride_room', { rideId });
  }

  // ── Captain sends location ─────────────────────
  updateLocation(data: { tripId?: string; rideId?: string; coordinates: number[] }) {
    this.socket?.emit('update_location', data);
  }

  // TASK-09: كابتن المسار الثابت يبث موقعه عبر Socket مباشرة لكل الراكبين  ─
  emitRouteLocation(data: { routeId: string; captainId: string; lat: number; lng: number }) {
    this.socket?.emit('route_location_update', data);
  }

  // TASK-09: راكب ينضم لغرفة مسار ثابت لتلقي تحديثات الكباتن ─────────────
  joinRouteRoom(routeId: string) {
    this.socket?.emit('join_trip', routeId);
  }

  leaveRouteRoom(routeId: string) {
    this.socket?.emit('leave_trip', routeId);
  }

  // ── On-Demand: Captain availability ───────────
  setCaptainAvailable(available: boolean, location?: number[]) {
    this.socket?.emit('captain_availability', { available, location });
  }

  // ── On-Demand: Passenger requests ride ────────
  requestRide(data: { pickupLocation: any; dropoffLocation: any }) {
    this.socket?.emit('request_ride', data);
  }

  // ── Captain responds to ride request ──────────
  respondToRideRequest(data: { rideId: string; accepted: boolean }) {
    this.socket?.emit('respond_ride_request', data);
  }

  // ── Event Listeners ────────────────────────────
  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }

  // ── Emit ───────────────────────────────────────
  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
export default socketService;
