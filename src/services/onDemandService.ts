import api from './api';
import { ApiResponse, OnDemandRide, NearbyCapt, OnDemandRequest } from '../types';

// ─────────────────────────────────────────────────────────────
// On-Demand Ride Service — Uber-style instant ride requests
// ─────────────────────────────────────────────────────────────

export const onDemandService = {
  // Passenger: request a new ride
  requestRide: (data: OnDemandRequest) =>
    api.post<ApiResponse<OnDemandRide>>('/rides/request', data),

  // Passenger: get nearby available captains
  getNearbyCaptains: (lat: number, lng: number) =>
    api.get<ApiResponse<NearbyCapt[]>>('/rides/nearby-captains', {
      params: { lat, lng },
    }),

  // Passenger: get estimated price before requesting
  estimatePrice: (data: { pickupCoords: number[]; dropoffCoords: number[] }) =>
    api.post<ApiResponse<{ price: number; distance: number; duration: number }>>('/rides/estimate', data),

  // Passenger: cancel a ride request
  cancelRide: (rideId: string, reason?: string) =>
    api.put<ApiResponse<OnDemandRide>>(`/rides/${rideId}/cancel`, { reason }),

  // Captain: get pending ride requests near him
  getPendingRequests: () =>
    api.get<ApiResponse<OnDemandRide[]>>('/rides/captain/pending'),

  // Captain: accept a ride request
  acceptRide: (rideId: string) =>
    api.put<ApiResponse<OnDemandRide>>(`/rides/${rideId}/accept`),

  // Captain: reject a ride request
  rejectRide: (rideId: string) =>
    api.put<ApiResponse<OnDemandRide>>(`/rides/${rideId}/reject`),

  // Captain: mark as arrived at pickup
  arrivedAtPickup: (rideId: string) =>
    api.put<ApiResponse<OnDemandRide>>(`/rides/${rideId}/arrived`),

  // Captain: start the ride (passenger is in the car)
  startRide: (rideId: string) =>
    api.put<ApiResponse<OnDemandRide>>(`/rides/${rideId}/start`),

  // Captain: complete the ride
  completeRide: (rideId: string) =>
    api.put<ApiResponse<OnDemandRide>>(`/rides/${rideId}/complete`),

  // Captain: update location during ride
  updateCaptainLocation: (rideId: string, coordinates: number[]) =>
    api.put<ApiResponse<any>>(`/rides/${rideId}/location`, { coordinates }),

  // Both: get ride details
  getRideById: (rideId: string) =>
    api.get<ApiResponse<OnDemandRide>>(`/rides/${rideId}`),

  // Alias للتوافق مع شاشات OnDemandTracking و OnDemandManagement
  getRide: (rideId: string) =>
    api.get<ApiResponse<OnDemandRide>>(`/rides/${rideId}`),

  // Alias لإرسال الموقع من OnDemandManagementScreen للخادم
  updateLocation: (rideId: string, coordinates: number[]) =>
    api.put<ApiResponse<any>>(`/rides/${rideId}/location`, { coordinates }),

  // Both: get ride history
  getRideHistory: () =>
    api.get<ApiResponse<OnDemandRide[]>>('/rides/my-rides'),
};
