import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for existing token and validate it
    const token = localStorage.getItem('adminToken');
    if (token) {
      // In a real app, you would validate the token with your backend
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '');
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userData');
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/admin')) {
          setLocation(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
        }
      }
    }
  }, [setLocation]);

  const login = (token: string) => {
    localStorage.setItem('adminToken', token);
    // For demo purposes, we'll create a mock user
    // In a real app, this would come from your backend
    const mockUser = {
      id: 1,
      username: 'admin',
      role: 'admin'
    };
    setUser(mockUser);
    localStorage.setItem('userData', JSON.stringify(mockUser));
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userData');
    setUser(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
