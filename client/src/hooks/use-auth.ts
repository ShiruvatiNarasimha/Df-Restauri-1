import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
  login: (token: string) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  getToken: () => string | null;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      user: null,
      login: (token: string) => {
        try {
          // Basic token validation
          if (!token || typeof token !== 'string') {
            throw new Error('Token is required');
          }

          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }

          // Decode token without verifying to check structure
          let payload: any;
          try {
            payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          } catch {
            throw new Error('Failed to decode token payload');
          }

          // Validate payload structure
          if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid token payload structure');
          }

          // Check required claims
          if (!payload.exp || !payload.id || !payload.role) {
            throw new Error('Missing required token claims');
          }

          // Store token and user data
          set({
            token,
            isAuthenticated: true,
            user: {
              id: payload.id,
              username: payload.username,
              role: payload.role
            }
          });

        } catch (error) {
          console.error('Token validation error:', error);
          get().logout();
          throw error;
        }
      },
      logout: () => {
        localStorage.removeItem('auth-storage');
        set({ token: null, isAuthenticated: false, user: null });
      },
      refreshToken: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const { token: newToken } = await response.json();
          get().login(newToken);
        } catch (error) {
          console.error('Token refresh error:', error);
          get().logout();
        }
      },
      getToken: () => {
        return get().token;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
