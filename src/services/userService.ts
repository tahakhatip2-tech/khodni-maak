import api from './api';
import { ApiResponse, User, SavedAddress } from '../types';

export const userService = {
  getProfile: (userId: string) =>
    api.get<ApiResponse<User>>(`/users/${userId}`),

  updateProfile: (data: Partial<User>) =>
    api.put<ApiResponse<User>>('/auth/update-profile', data),

  updateLocation: (coordinates: number[]) =>
    api.put<ApiResponse<any>>('/users/location', { coordinates }),

  getStatistics: () =>
    api.get<ApiResponse<any>>('/users/statistics'),

  getSavedAddresses: () =>
    api.get<ApiResponse<SavedAddress[]>>('/saved-addresses'),

  addSavedAddress: (data: Partial<SavedAddress>) =>
    api.post<ApiResponse<SavedAddress>>('/saved-addresses', data),

  deleteSavedAddress: (id: string) =>
    api.delete(`/saved-addresses/${id}`),

  savePushToken: (token: string) =>
    api.put<ApiResponse<any>>('/users/push-token', { pushToken: token }),

  uploadAvatar: async (imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    return api.post<ApiResponse<{ avatar: string }>>('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
