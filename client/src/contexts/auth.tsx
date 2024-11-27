import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { validateAndDecodeToken, TokenValidationError, type JWTPayload } from '@/utils/jwt';

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const handleAuthError = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userData');
    setUser(null);
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/admin')) {
      setLocation(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  };

  const getToken = async (): Promise<string | null> => {
    const token = localStorage.getItem('adminToken');
    if (!token) return null;

    try {
      const decoded = validateAndDecodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const refreshThreshold = 5 * 60; // 5 minutes before expiry
      
      if (decoded.exp && decoded.exp <= currentTime) {
        handleAuthError();
        return null;
      }

      // Check if token needs refresh
      if (decoded.exp && decoded.exp - currentTime <= refreshThreshold) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const { token: newToken } = await response.json();
            localStorage.setItem('adminToken', newToken);
            return newToken;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      return token;
    } catch (error) {
      handleAuthError();
      return null;
    }
  };

  useEffect(() => {
    const validateToken = async () => {
      // Clear existing tokens if invalid
      const token = await getToken();
      if (!token) {
        handleAuthError();
        return;
      }

      try {
        const decoded = validateAndDecodeToken(token);
        if (!decoded || typeof decoded !== 'object') {
          throw new Error('Invalid token payload');
        }
        
        const userData = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        };

        // Validate required user data fields
        if (!userData.id || !userData.username || !userData.role) {
          throw new Error('Missing required user data fields');
        }
        
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData));
      } catch (error) {
        console.error('Error validating token:', error);
        handleAuthError();
      }
    };

    validateToken();
  }, []);

  const login = (token: string) => {
    try {
      const decoded = validateAndDecodeToken(token);
      const userData = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      localStorage.setItem('adminToken', token);
      setUser(userData);
      localStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Error processing login:', error);
      handleAuthError();
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userData');
    setUser(null);
    setLocation('/login');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}