import api from './api';

export interface PermanentRoute {
  _id: string;
  name: string;
  description?: string;
  startLocation: {
    type: 'Point';
    coordinates: number[];
    address: string;
  };
  endLocation: {
    type: 'Point';
    coordinates: number[];
    address: string;
  };
  waypoints?: {
    type: 'Point';
    coordinates: number[];
    address: string;
  }[];
  departureTime: string;        // "HH:MM"
  estimatedDuration: number;    // minutes
  daysOfWeek: string[];
  pricePerSeat: number;
  currency: string;
  maxCaptains: number;
  seatsPerCaptain: number;
  status: 'active' | 'paused' | 'archived';
  subscribedCaptains: {
    captain: {
      _id: string;
      name: string;
      avatar: string;
      rating: { average: number; count: number };
      vehicle?: any;
    };
    joinedAt: string;
    status: 'active' | 'inactive';
  }[];
  totalTripsCompleted: number;
  averageRating: number;
  createdAt: string;
}

export interface CreateRoutePayload {
  name: string;
  description?: string;
  startLocation: { type: 'Point'; coordinates: number[]; address: string };
  endLocation: { type: 'Point'; coordinates: number[]; address: string };
  departureTime: string;
  estimatedDuration: number;
  daysOfWeek: string[];
  pricePerSeat: number;
  maxCaptains: number;
  seatsPerCaptain: number;
}

export const permanentRouteService = {
  // ── جلب المسارات النشطة ─────────────────────────────
  getRoutes: (status?: string) =>
    api.get<any>('/permanent-routes', { params: status ? { status } : {} }),

  // ── تفاصيل مسار ─────────────────────────────────────
  getRouteById: (id: string) =>
    api.get<any>(`/permanent-routes/${id}`),

  // ── كباتن المسار ─────────────────────────────────────
  getRouteCaptains: (id: string) =>
    api.get<any>(`/permanent-routes/${id}/captains`),

  // ── اشتراك كابتن ─────────────────────────────────────
  subscribeToRoute: (id: string) =>
    api.post<any>(`/permanent-routes/${id}/subscribe`),

  // ── إلغاء اشتراك ─────────────────────────────────────
  unsubscribeFromRoute: (id: string) =>
    api.delete<any>(`/permanent-routes/${id}/unsubscribe`),

  // ── [ADMIN] إنشاء مسار ───────────────────────────────
  createRoute: (data: CreateRoutePayload) =>
    api.post<any>('/permanent-routes', data),

  // ── [ADMIN] تعديل مسار ───────────────────────────────
  updateRoute: (id: string, data: Partial<CreateRoutePayload>) =>
    api.put<any>(`/permanent-routes/${id}`, data),

  // ── [ADMIN] تغيير حالة المسار ────────────────────────
  updateRouteStatus: (id: string, status: 'active' | 'paused' | 'archived') =>
    api.patch<any>(`/permanent-routes/${id}/status`, { status }),

  // ── [ADMIN] إحصائيات ─────────────────────────────────
  getAdminStats: () =>
    api.get<any>('/permanent-routes/admin/stats'),

  // ── حجوزات مسار محدد للكابتن ──────────────────────────
  getRouteBookings: (routeId: string) =>
    api.get<any>(`/permanent-routes/${routeId}/bookings`),
};
