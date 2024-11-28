import { createContext, useContext, ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import React from 'react';

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
  getToken: () => string | null;
}

// Create the auth store with Zustand
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      user: null,
      getToken: () => get().token,
      login: (token: string) => {
        try {
          if (!token || typeof token !== 'string') {
            throw new Error('Token is required');
          }

          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }

          let payload: any;
          try {
            payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          } catch {
            throw new Error('Failed to decode token payload');
          }

          if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid token payload structure');
          }

          if (!payload.exp || !payload.id || !payload.role) {
            throw new Error('Missing required token claims');
          }

          // Check token expiration
          const currentTime = Math.floor(Date.now() / 1000);
          if (payload.exp <= currentTime) {
            throw new Error('Token has expired');
          }

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

          const data = await response.json();
          get().login(data.token);
        } catch (error) {
          console.error('Token refresh error:', error);
          get().logout();
        }
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

// Export the hook as a named constant function
function useAuth() {
  return useAuthStore();
}

export { useAuth };

// Error boundary component
class AuthErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Auth Error:', error);
    useAuthStore.getState().logout();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">Please try logging in again.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthErrorBoundary>
      {children}
    </AuthErrorBoundary>
  );
}
