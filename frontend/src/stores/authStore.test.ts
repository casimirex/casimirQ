import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User } from '@/types';

const user: User = { id: 'u1', email: 'a@example.com' };

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('starts unauthenticated', () => {
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('setAuth stores token/user and marks authenticated', () => {
    useAuthStore.getState().setAuth('tok', user, 'refresh');
    const s = useAuthStore.getState();
    expect(s.token).toBe('tok');
    expect(s.refreshToken).toBe('refresh');
    expect(s.user).toEqual(user);
    expect(s.isAuthenticated).toBe(true);
  });

  it('logout clears all auth state', () => {
    useAuthStore.getState().setAuth('tok', user);
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  it('setToken updates only the token', () => {
    useAuthStore.getState().setToken('new-token');
    expect(useAuthStore.getState().token).toBe('new-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('persists auth to localStorage (not loading state)', () => {
    useAuthStore.getState().setAuth('tok', user);
    useAuthStore.getState().setLoading(true);
    const persisted = JSON.parse(localStorage.getItem('casimirq-auth')!);
    expect(persisted.state.token).toBe('tok');
    expect(persisted.state.isAuthenticated).toBe(true);
    expect(persisted.state).not.toHaveProperty('isLoading');
  });
});
