import api from './api';
import { ApiResponse, Trip, TripSearchParams } from '../types';

interface CreateTripPayload {
  tripType: string;
  startLocation: { type: 'Point'; coordinates: number[]; address: string };
  endLocation: { type: 'Point'; coordinates: number[]; address: string };
  departureTime: string;
  estimatedArrivalTime: string;
  availableSeats: number;
  pricePerSeat: number;
  recurring?: { enabled: boolean; days: string[]; endDate?: string };
  preferences?: { smokingAllowed: boolean; petsAllowed: boolean; musicAllowed: boolean };
  notes?: string;
}

export const tripService = {
  // ── Carpooling ──────────────────────────────────────────
  createTrip: (data: CreateTripPayload) =>
    api.post<ApiResponse<Trip>>('/trips', data),

  searchTrips: (params: TripSearchParams) =>
    api.post<ApiResponse<Trip[]>>('/trips/search', params),

  getTripById: (id: string) =>
    api.get<ApiResponse<Trip>>(`/trips/${id}`),

  getCaptainTrips: (status?: string) =>
    api.get<ApiResponse<Trip[]>>('/trips/captain', { params: { status } }),

  getUserTripHistory: (role?: 'captain' | 'passenger') =>
    api.get<ApiResponse<Trip[]>>('/trips/my-history', { params: { role } }),

  updateTripStatus: (id: string, status: string) =>
    api.put<ApiResponse<Trip>>(`/trips/${id}/status`, { status }),

  updateTripLocation: (id: string, coordinates: number[]) =>
    api.put<ApiResponse<any>>(`/trips/${id}/location`, { coordinates }),

  updatePassengerStatus: (tripId: string, passengerId: string, status: string) =>
    api.put<ApiResponse<Trip>>(`/trips/${tripId}/passengers/${passengerId}/status`, { status }),

  cancelTrip: (id: string, reason?: string) =>
    api.put<ApiResponse<any>>(`/trips/${id}/cancel`, { reason }),

  likeTrip: (id: string) =>
    api.post<ApiResponse<any>>(`/trips/${id}/like`),
};
