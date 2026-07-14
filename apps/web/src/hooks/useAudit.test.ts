import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudit } from './useAudit';

/**
 * TEST SUITE: Issue #19 - Audit Trail - Search & Filter
 * Tests verify:
 * - Fetching audit events with pagination
 * - Filtering by date range
 * - Searching by actor
 * - Filtering by action type
 * - Sorting columns
 */

describe('useAudit - Issue #19', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('getAuditEvents', () => {
    it('should fetch audit events with pagination (50 per page)', async () => {
      const mockEvents = [
        {
          id: 'audit-1',
          timestamp: '2026-07-14T10:00:00Z',
          actor: 'alice',
          action: 'POST_CREATED',
          resource: 'post',
          resourceId: 'post-1',
          details: { title: 'New post' },
        },
        {
          id: 'audit-2',
          timestamp: '2026-07-14T10:05:00Z',
          actor: 'bob',
          action: 'COMMENT_ADDED',
          resource: 'comment',
          resourceId: 'comment-1',
          details: { text: 'Nice!' },
        },
      ];

      const mockResponse = {
        items: mockEvents,
        totalCount: 2,
        pageNumber: 1,
        pageSize: 50,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      let response;
      await act(async () => {
        response = await result.current.getAuditEvents(1);
      });

      expect(response.items).toEqual(mockEvents);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/audit?page=1&pageSize=50',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should support custom pagination', async () => {
      const mockResponse = {
        items: [],
        totalCount: 100,
        pageNumber: 2,
        pageSize: 50,
        totalPages: 2,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        await result.current.getAuditEvents(2, 50);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/audit?page=2&pageSize=50',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('filterByDateRange', () => {
    it('should filter audit events by date range', async () => {
      const mockResponse = {
        items: [
          {
            id: 'audit-1',
            timestamp: '2026-07-10T10:00:00Z',
            actor: 'alice',
            action: 'POST_CREATED',
            resource: 'post',
            resourceId: 'post-1',
            details: {},
          },
        ],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 50,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        await result.current.filterByDateRange(
          '2026-07-01',
          '2026-07-14'
        );
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-07-01'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2026-07-14'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('searchByActor', () => {
    it('should search audit events by actor name/id', async () => {
      const mockResponse = {
        items: [
          {
            id: 'audit-1',
            timestamp: '2026-07-14T10:00:00Z',
            actor: 'alice',
            action: 'POST_CREATED',
            resource: 'post',
            resourceId: 'post-1',
            details: {},
          },
        ],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 50,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        await result.current.searchByActor('alice');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('actor=alice'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('filterByAction', () => {
    it('should filter audit events by action type', async () => {
      const mockResponse = {
        items: [
          {
            id: 'audit-1',
            timestamp: '2026-07-14T10:00:00Z',
            actor: 'alice',
            action: 'POST_CREATED',
            resource: 'post',
            resourceId: 'post-1',
            details: {},
          },
        ],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 50,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        await result.current.filterByAction('POST_CREATED');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('action=POST_CREATED'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should filter by multiple action types', async () => {
      const mockResponse = {
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 50,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        await result.current.filterByAction(['POST_CREATED', 'POST_DELETED']);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('action'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('sortAuditEvents', () => {
    it('should sort audit events by column', async () => {
      const mockResponse = {
        items: [
          {
            id: 'audit-1',
            timestamp: '2026-07-14T10:00:00Z',
            actor: 'alice',
            action: 'POST_CREATED',
            resource: 'post',
            resourceId: 'post-1',
            details: {},
          },
        ],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 50,
        totalPages: 1,
        hasNextPage: false,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        await result.current.sortAuditEvents('timestamp', 'desc');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=timestamp'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortOrder=desc'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useAudit(mockUserId));

      await act(async () => {
        try {
          await result.current.getAuditEvents(1);
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Server error');
        }
      });
    });
  });
});
