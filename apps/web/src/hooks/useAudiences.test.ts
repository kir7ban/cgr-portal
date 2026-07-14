import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudiences } from './useAudiences';

/**
 * TEST SUITE: Issue #18 - Audience Management - CRUD
 * Tests verify:
 * - Creating audiences
 * - Reading/listing audiences
 * - Updating audiences
 * - Deleting audiences
 * - Managing audience members
 */

describe('useAudiences - Issue #18', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('createAudience', () => {
    it('should create a new audience', async () => {
      const mockAudience = {
        id: 'audience-1',
        name: 'Engineering Team',
        description: 'All engineers',
        members: [],
        createdAt: '2026-07-14T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockAudience,
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let createdAudience;
      await act(async () => {
        createdAudience = await result.current.createAudience(
          'Engineering Team',
          'All engineers'
        );
      });

      expect(createdAudience).toEqual(mockAudience);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/audiences',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            name: 'Engineering Team',
            description: 'All engineers',
          }),
        })
      );
    });

    it('should handle validation error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Audience name required' } }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      await act(async () => {
        try {
          await result.current.createAudience('', 'description');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Audience name required');
        }
      });
    });
  });

  describe('getAudiences', () => {
    it('should fetch list of audiences', async () => {
      const mockAudiences = [
        { id: 'a1', name: 'Engineering', description: 'Engineers', members: [], createdAt: '2026-07-14T10:00:00Z' },
        { id: 'a2', name: 'Marketing', description: 'Marketers', members: [], createdAt: '2026-07-14T10:01:00Z' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockAudiences,
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let audiences;
      await act(async () => {
        audiences = await result.current.getAudiences();
      });

      expect(audiences).toEqual(mockAudiences);
      expect(global.fetch).toHaveBeenCalledWith('/api/audiences', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should handle empty audiences list', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let audiences;
      await act(async () => {
        audiences = await result.current.getAudiences();
      });

      expect(audiences).toEqual([]);
    });

    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      await act(async () => {
        try {
          await result.current.getAudiences();
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Server error');
        }
      });
    });
  });

  describe('updateAudience', () => {
    it('should update audience details', async () => {
      const audienceId = 'audience-1';
      const mockUpdated = {
        id: audienceId,
        name: 'Updated Name',
        description: 'Updated description',
        members: [],
        createdAt: '2026-07-14T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdated,
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let updated;
      await act(async () => {
        updated = await result.current.updateAudience(
          audienceId,
          'Updated Name',
          'Updated description'
        );
      });

      expect(updated).toEqual(mockUpdated);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/audiences/${audienceId}`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Updated Name',
            description: 'Updated description',
          }),
        })
      );
    });

    it('should handle update error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Audience not found' } }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      await act(async () => {
        try {
          await result.current.updateAudience('non-existent', 'name', 'desc');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Audience not found');
        }
      });
    });
  });

  describe('deleteAudience', () => {
    it('should delete an audience', async () => {
      const audienceId = 'audience-1';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteAudience(audienceId);
      });

      expect(deleteResult).toEqual({ deleted: true });
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/audiences/${audienceId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle delete error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Audience not found' } }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      await act(async () => {
        try {
          await result.current.deleteAudience('non-existent');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Audience not found');
        }
      });
    });
  });

  describe('addMember', () => {
    it('should add member to audience', async () => {
      const audienceId = 'audience-1';
      const userId = 'user-456';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, memberAdded: true }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let addResult;
      await act(async () => {
        addResult = await result.current.addMember(audienceId, userId);
      });

      expect(addResult).toEqual({ success: true, memberAdded: true });
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/audiences/${audienceId}/members`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId }),
        })
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member from audience', async () => {
      const audienceId = 'audience-1';
      const userId = 'user-456';

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, memberRemoved: true }),
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let removeResult;
      await act(async () => {
        removeResult = await result.current.removeMember(audienceId, userId);
      });

      expect(removeResult).toEqual({ success: true, memberRemoved: true });
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/audiences/${audienceId}/members/${userId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('getMembers', () => {
    it('should get audience members', async () => {
      const audienceId = 'audience-1';
      const mockMembers = [
        { id: 'user-1', username: 'alice', email: 'alice@bosch.com' },
        { id: 'user-2', username: 'bob', email: 'bob@bosch.com' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembers,
      });

      const { result } = renderHook(() => useAudiences(mockUserId));

      let members;
      await act(async () => {
        members = await result.current.getMembers(audienceId);
      });

      expect(members).toEqual(mockMembers);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/audiences/${audienceId}/members`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});
