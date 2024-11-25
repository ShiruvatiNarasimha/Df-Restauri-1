import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { jwtDecode } from 'jwt-decode';

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

interface JWTPayload {
  exp: number;
  id: number;
  role: string;
  username: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded = jwt_decode<JWTPayload>(token);
      // Check if token is expired (considering a 30-second buffer)
      return decoded.exp * 1000 < Date.now() + 30000;
    } catch {
      return true;
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { token } = await response.json();
      localStorage.setItem('adminToken', token);
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      handleAuthError();
      return null;
    }
  };

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

    if (isTokenExpired(token)) {
      return await refreshToken();
    }

    return token;
  };

  useEffect(() => {
    const validateToken = async () => {
      const token = await getToken();
      if (!token) {
        handleAuthError();
        return;
      }

      try {
        const decoded = jwt_decode<JWTPayload>(token);
        const userData = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        };
        setUser(userData);
        localStorage.setItem('userData', JSON.stringify(userData));
      } catch (error) {
        console.error('Error validating token:', error);
        handleAuthError();
      }
    };

    validateToken();
  }, [setLocation]);

  const login = (token: string) => {
    try {
      const decoded = jwt_decode<JWTPayload>(token);
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
