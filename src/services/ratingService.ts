import api from './api';
import { ApiResponse, Rating } from '../types';

export const ratingService = {
  submitRating: (data: {
    ratedUserId: string;
    rating: number;
    comment?: string;
    tags?: string[];
    tripId?: string;
    rideId?: string;
  }) => api.post<ApiResponse<Rating>>('/ratings', data),

  getUserRatings: (userId: string) =>
    api.get<ApiResponse<Rating[]>>(`/ratings/user/${userId}`),
};
