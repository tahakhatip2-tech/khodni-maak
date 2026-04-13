import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import socketService from '../services/socketService';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // ── Load persisted session on app start ──────────────
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // ── Register for push notifications when authenticated ──────────────
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      registerForPushNotificationsAsync().catch(err => console.log('Push Registration Error', err));
    }
  }, [state.isAuthenticated, state.user]);

  const loadStoredAuth = async () => {
    try {
      const [token, refreshToken, userJson] = await AsyncStorage.multiGet([
        'token', 'refreshToken', 'user',
      ]);
      const storedToken = token[1];
      const storedRefresh = refreshToken[1];
      const storedUser = userJson[1] ? JSON.parse(userJson[1]) : null;

      if (storedToken && storedUser) {
        setState({
          user: storedUser,
          token: storedToken,
          refreshToken: storedRefresh,
          isAuthenticated: true,
          isLoading: false,
        });
        // Connect socket
        const socket = await socketService.connect();
        socketService.joinUserRoom(storedUser._id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = useCallback(async (phone: string, password: string) => {
    const { data } = await authService.login({ phone, password });
    const { user, accessToken, refreshToken } = data.data;

    await AsyncStorage.multiSet([
      ['token', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
    ]);

    setState({
      user,
      token: accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });

    const socket = await socketService.connect();
    socketService.joinUserRoom(user._id);
  }, []);

  const register = useCallback(async (
    name: string, phone: string, password: string, role: string
  ) => {
    const { data } = await authService.register({ name, phone, password, role });
    const { user, accessToken, refreshToken } = data.data;

    await AsyncStorage.multiSet([
      ['token', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
    ]);

    setState({
      user,
      token: accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });

    const socket = await socketService.connect();
    socketService.joinUserRoom(user._id);
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    socketService.disconnect();
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const { data: res } = await userService.updateProfile(data);
    const updatedUser = res.data;
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setState(prev => ({ ...prev, user: updatedUser }));
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authService.getMe();
    const updatedUser = data.data;
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setState(prev => ({ ...prev, user: updatedUser }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
