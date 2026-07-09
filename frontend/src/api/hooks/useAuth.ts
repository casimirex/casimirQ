/**
 * Authentication API Hooks
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import type { AuthResponse, LoginCredentials, User } from '@/types';

const AUTH_KEY = 'auth';

/**
 * Login mutation
 */
export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response;
    },
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
    },
    onError: (error) => {
      console.error('Login error:', error);
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout', {});
    },
    onSuccess: () => {
      logout();
    },
    onError: () => {
      // Still logout on error
      logout();
    },
  });
}

/**
 * Get current user
 */
export function useCurrentUser() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: [AUTH_KEY, 'me'],
    queryFn: async () => {
      const response = await api.get<{ user: User }>('/auth/me');
      return response.user;
    },
    enabled: !!token,
  });
}

/**
 * Refresh token mutation
 */
export function useRefreshToken() {
  const setToken = useAuthStore((state) => state.setToken);

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post<{ access_token: string }>('/auth/refresh', {
        token,
      });
      return response;
    },
    onSuccess: (data) => {
      setToken(data.access_token);
    },
  });
}

/**
 * Validate token
 */
export function useValidateToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post<{ valid: boolean; user?: User }>(
        '/auth/validate',
        { token }
      );
      return response;
    },
  });
}
