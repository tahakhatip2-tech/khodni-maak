import api from './api';
import { ApiResponse, Booking } from '../types';

interface CreateBookingPayload {
  tripId?: string;
  permanentRouteId?: string;
  pickupLocation: { type: 'Point'; coordinates: number[]; address: string };
  dropoffLocation: { type: 'Point'; coordinates: number[]; address: string };
  seatsBooked?: number;
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'subscription';
  specialRequests?: string;
}

export const bookingService = {
  createBooking: (data: CreateBookingPayload) =>
    api.post<ApiResponse<Booking>>('/bookings', data),

  getMyBookings: (params?: { status?: string; role?: string; page?: number; limit?: number; tripId?: string; permanentRouteId?: string }) =>
    api.get<ApiResponse<Booking[]>>('/bookings/my-bookings', { params }),

  getBookingById: (id: string) =>
    api.get<ApiResponse<Booking>>(`/bookings/${id}`),

  confirmBooking: (id: string) =>
    api.put<ApiResponse<Booking>>(`/bookings/${id}/confirm`),

  rejectBooking: (id: string, reason?: string) =>
    api.put<ApiResponse<Booking>>(`/bookings/${id}/reject`, { reason }),

  cancelBooking: (id: string, reason?: string) =>
    api.delete<ApiResponse<any>>(`/bookings/${id}`, { data: { reason } }),

  updatePayment: (id: string, status: string, transactionId?: string) =>
    api.put<ApiResponse<Booking>>(`/bookings/${id}/payment`, { status, transactionId }),

  // جلب حجوزات راكب بناءً على permanentRouteId (للتحقق من وجود حجز نشط)
  getBookingByRoute: (permanentRouteId: string) =>
    api.get<ApiResponse<Booking[]>>('/bookings/my-bookings', { params: { permanentRouteId, role: 'passenger' } }),
};
