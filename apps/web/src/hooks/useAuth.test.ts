import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #1 - JWT Authentication & Login Flow
 *
 * RED Phase: Test behavior #1
 * - User can login with valid credentials and receive JWT token
 * - Token stored in localStorage
 */

describe('useAuth Hook - JWT Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Behavior #1: Successfully login with valid credentials', () => {
    it('should store JWT token in localStorage after successful login', async () => {
      const { result } = renderHook(() => useAuth());

      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      await act(async () => {
        await result.current.login('alice', 'password123');
      });

      expect(localStorage.getItem('auth_token')).toBe(mockToken);
    });
  });

  describe('Behavior #2: useAuth hook decodes JWT payload', () => {
    it('should provide currentUser with userId, username, role from JWT payload', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      const { result } = renderHook(() => useAuth());

      expect(result.current.currentUser).toEqual({
        userId: '123',
        username: 'alice',
        role: 'COMMS_OFFICER',
      });
    });
  });

  describe('Behavior #3: logout() clears token', () => {
    it('should clear token from localStorage on logout', () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.currentUser).toBeNull();
    });
  });

  describe('Behavior #4: Invalid credentials show error', () => {
    it('should set error when login fails with invalid credentials', async () => {
      const { result } = renderHook(() => useAuth());

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }),
      });

      await act(async () => {
        await result.current.login('alice', 'wrongpassword');
      });

      expect(result.current.error).toBe('Invalid credentials');
      expect(result.current.currentUser).toBeNull();
    });
  });

  describe('Behavior #5: Network error handling', () => {
    it('should handle network errors gracefully', async () => {
      const { result } = renderHook(() => useAuth());

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.login('alice', 'password123');
      });

      expect(result.current.error).toContain('Connection');
      expect(result.current.currentUser).toBeNull();
    });
  });
});
