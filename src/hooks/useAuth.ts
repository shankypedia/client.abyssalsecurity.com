import { useState, useEffect } from 'react';
import { apiService, User } from '@/services/api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          const response = await apiService.verifyToken();
          if (response.success && response.user) {
            setUser(response.user);
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear storage
            apiService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (error) {
          // Token verification failed, clear storage
          apiService.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        return response;
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await apiService.register(email, username, password);
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        return response;
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };
};