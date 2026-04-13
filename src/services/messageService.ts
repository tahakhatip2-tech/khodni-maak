import api from './api';
import { ApiResponse, Message, ChatRoom } from '../types';

export const messageService = {
  getMessages: (userId: string, tripId?: string, rideId?: string) =>
    api.get<ApiResponse<Message[]>>('/messages', {
      params: { userId, tripId, rideId },
    }),

  sendMessage: (data: { receiverId: string; content: string; tripId?: string; rideId?: string }) =>
    api.post<ApiResponse<Message>>('/messages', data),

  markAsRead: (userId: string) =>
    api.put<ApiResponse<any>>(`/messages/${userId}/read`),

  getConversations: () =>
    api.get<ApiResponse<ChatRoom[]>>('/messages/conversations'),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/messages/unread-count'),
};
