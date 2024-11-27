import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
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

          // Check token expiration with 5-minute buffer
          const expirationTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

          if (currentTime >= expirationTime - bufferTime) {
            throw new Error('Token has expired or is about to expire');
          }

          // Store token and authenticate
          set({ token, isAuthenticated: true });

          // Schedule token refresh if needed
          const timeUntilExpiry = expirationTime - currentTime;
          if (timeUntilExpiry < 24 * 60 * 60 * 1000) { // Less than 24 hours until expiry
            setTimeout(() => {
              console.log('Token refresh required');
              set({ token: null, isAuthenticated: false });
            }, timeUntilExpiry - bufferTime);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
          console.error('Token validation error:', { name: 'TokenValidationError', message: errorMessage });
          set({ token: null, isAuthenticated: false });
          throw new Error(errorMessage);
        }
      },
      logout: () => {
        set({ token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
