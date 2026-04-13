import api from './api';
import { ApiResponse, Notification } from '../types';

export const notificationService = {
  getAll: (page = 1, limit = 20) =>
    api.get<ApiResponse<Notification[]>>('/notifications', { params: { page, limit } }),

  markRead: (id: string) =>
    api.put<ApiResponse<any>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put<ApiResponse<any>>('/notifications/read-all'),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};
