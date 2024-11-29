import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { validateAndDecodeToken } from '@/utils/jwt';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setLocation] = useLocation();
  
  const {
    data: user,
    isLoading,
    error
  } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      try {
        const decoded = validateAndDecodeToken(token);
        return {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        };
      } catch (err) {
        handleAuthError();
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  });

  const handleAuthError = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userData');
    queryClient.setQueryData(['user'], null);
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
      
      if (decoded.exp && decoded.exp <= currentTime) {
        handleAuthError();
        return null;
      }
      
      return token;
    } catch (error) {
      handleAuthError();
      return null;
    }
  };

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (token: string) => {
      try {
        const decoded = validateAndDecodeToken(token);
        const userData = {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role
        };
        localStorage.setItem('adminToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        return userData;
      } catch (error) {
        console.error('Error processing login:', error);
        handleAuthError();
        throw error;
      }
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(['user'], userData);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('userData');
      queryClient.setQueryData(['user'], null);
      setLocation('/login');
    }
  });

  if (!isInitialized) {
    return null;
  }

  return (
    <AuthContext.Provider 
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth };
export default AuthProvider;