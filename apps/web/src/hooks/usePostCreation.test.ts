import { renderHook, act } from '@testing-library/react';
import { usePostCreation } from './usePostCreation';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #6 - Post Creation Hook
 *
 * Tests the usePostCreation hook that manages post creation logic
 */

describe('usePostCreation Hook - Issue #6', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Behavior #1: Create post with valid content', () => {
    it('should successfully create a post and return response', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          content: 'This is a test post',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
        }),
      });

      const { result } = renderHook(() => usePostCreation());

      const payload = {
        content: 'This is a test post',
        media: [],
      };

      let response;
      await act(async () => {
        response = await result.current.createPost(payload);
      });

      expect(response).toBeDefined();
      expect(response?.status).toBe('DRAFT');
      expect(response?.content).toBe('This is a test post');
    });
  });

  describe('Behavior #2: Handle API errors gracefully', () => {
    it('should set error when API returns error', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid post data' } }),
      });

      const { result } = renderHook(() => usePostCreation());

      const payload = {
        content: 'Test post',
        media: [],
      };

      await act(async () => {
        await result.current.createPost(payload);
      });

      expect(result.current.error).toBe('Invalid post data');
    });
  });

  describe('Behavior #3: Handle network errors', () => {
    it('should handle network errors', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePostCreation());

      const payload = {
        content: 'Test post',
        media: [],
      };

      await act(async () => {
        await result.current.createPost(payload);
      });

      expect(result.current.error).toContain('Network error');
    });
  });

  describe('Behavior #4: Check authentication requirement', () => {
    it('should require authentication and not allow unauthenticated posts', async () => {
      localStorage.clear();

      const { result } = renderHook(() => usePostCreation());

      const payload = {
        content: 'Test post',
        media: [],
      };

      let response;
      await act(async () => {
        response = await result.current.createPost(payload);
      });

      expect(response).toBeNull();
      expect(result.current.error).toContain('must be logged in');
    });
  });

  describe('Behavior #5: Loading state management', () => {
    it('should set isLoading to false after completion', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          content: 'Test',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
        }),
      });

      const { result } = renderHook(() => usePostCreation());

      const payload = {
        content: 'Test post',
        media: [],
      };

      await act(async () => {
        await result.current.createPost(payload);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Behavior #6: Clear error function', () => {
    it('should clear error when clearError is called', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Error' } }),
      });

      const { result } = renderHook(() => usePostCreation());

      const payload = {
        content: 'Test post',
        media: [],
      };

      await act(async () => {
        await result.current.createPost(payload);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
