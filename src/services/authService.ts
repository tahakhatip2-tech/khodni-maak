import api from './api';
import { ApiResponse, User } from '../types';

interface LoginPayload { phone: string; password: string; }
interface RegisterPayload { name: string; phone: string; password: string; role: string; }
interface AuthData { user: User; accessToken: string; refreshToken: string; }

export const authService = {
  login: (data: LoginPayload) =>
    api.post<ApiResponse<AuthData>>('/auth/login', data),

  register: (data: RegisterPayload) =>
    api.post<ApiResponse<AuthData>>('/auth/register', data),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh-token', { refreshToken }),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    api.put<ApiResponse<User>>('/auth/update-profile', data),
};
