import { useState, useCallback, useEffect } from 'react';

export interface CurrentUser {
  userId: string;
  username: string;
  role: 'EMPLOYEE' | 'COMMS_OFFICER' | 'ADMIN';
}

export interface UseAuthReturn {
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AUTH_TOKEN_KEY = 'auth_token';

function decodeToken(token: string): CurrentUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };
  } catch (error) {
    return null;
  }
}

export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      const user = decodeToken(token);
      setCurrentUser(user);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Login failed';
        setError(errorMessage);
        setCurrentUser(null);
        return;
      }

      const data = await response.json();
      const token = data.token;

      localStorage.setItem(AUTH_TOKEN_KEY, token);

      const user = decodeToken(token);
      setCurrentUser(user);
      setError(null);
    } catch (err) {
      setError('Connection lost. Please check your network and try again.');
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setCurrentUser(null);
    setError(null);
  }, []);

  return {
    currentUser,
    login,
    logout,
    isLoading,
    error,
  };
}
