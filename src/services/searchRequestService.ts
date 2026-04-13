import api from './api';

export const searchRequestService = {
  createRequest: (data: any) => api.post('/search-requests', data),
  getMyRequests: () => api.get('/search-requests/my-requests'),
  cancelRequest: (id: string) => api.put(`/search-requests/${id}/cancel`),
};
