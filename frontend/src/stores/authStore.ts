/**
 * Authentication Store
 * Zustand store for auth state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  // State
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setToken: (token: string) => void;
  setRefreshToken: (token: string) => void;
  setUser: (user: User) => void;
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Set token only
      setToken: (token: string) => {
        set({ token });
      },

      // Set refresh token only
      setRefreshToken: (refreshToken: string) => {
        set({ refreshToken });
      },

      // Set user only
      setUser: (user: User) => {
        set({ user });
      },

      // Set both token and user (login)
      setAuth: (token: string, user: User, refreshToken?: string) => {
        set({
          token,
          refreshToken: refreshToken || null,
          user,
          isAuthenticated: true,
        });
      },

      // Logout - clear all auth state
      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'casimirq-auth',
      // Only persist token and user, not loading state
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Selector hooks for better performance
 */
export const useToken = () => useAuthStore((state) => state.token);
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useRefreshTokenValue = () => useAuthStore((state) => state.refreshToken);
