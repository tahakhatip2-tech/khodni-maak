import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Base URL — Use process.env or fallback to local IP ──
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.42.208:5000/api';
const BASE_URL = API_URL;

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ── Request Interceptor: attach token ──
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle 401 / refresh token ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        const newToken = data.data.accessToken;

        await AsyncStorage.setItem('token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh failed → clear storage → redirect to login
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        // Navigation handled by AuthContext
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const setBaseURL = (url: string) => {
  api.defaults.baseURL = `${url}/api`;
};

export default api;
