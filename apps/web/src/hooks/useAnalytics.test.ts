import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalytics } from './useAnalytics';

/**
 * TEST SUITE: Issue #20 - Analytics Dashboard - Metrics & Trends
 * Tests verify:
 * - Fetching dashboard metrics
 * - 30-day engagement trends
 * - Top 5 posts ranking
 * - Date range selector (7, 30, 90 days)
 */

describe('useAnalytics - Issue #20', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('getDashboardMetrics', () => {
    it('should fetch dashboard metrics', async () => {
      const mockMetrics = {
        totalEngagement: 245,
        submissionVolume: 42,
        approvalTime: 3.5,
        timestamp: '2026-07-14T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      let metrics;
      await act(async () => {
        metrics = await result.current.getDashboardMetrics('30d');
      });

      expect(metrics).toEqual(mockMetrics);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/dashboard?period=30d',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should support different time periods', async () => {
      const mockMetrics = {
        totalEngagement: 100,
        submissionVolume: 15,
        approvalTime: 2.0,
        timestamp: '2026-07-14T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      await act(async () => {
        await result.current.getDashboardMetrics('7d');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=7d'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return engagement, submission, and approval metrics', async () => {
      const mockMetrics = {
        totalEngagement: 500,
        submissionVolume: 85,
        approvalTime: 4.2,
        timestamp: '2026-07-14T10:00:00Z',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      let metrics;
      await act(async () => {
        metrics = await result.current.getDashboardMetrics('30d');
      });

      expect(metrics.totalEngagement).toBe(500);
      expect(metrics.submissionVolume).toBe(85);
      expect(metrics.approvalTime).toBe(4.2);
    });
  });

  describe('getEngagementTrend', () => {
    it('should fetch 30-day engagement trend', async () => {
      const mockTrend = {
        data: [
          { date: '2026-06-14', engagement: 10 },
          { date: '2026-06-15', engagement: 15 },
          { date: '2026-06-16', engagement: 12 },
        ],
        period: '30d',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrend,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      let trend;
      await act(async () => {
        trend = await result.current.getEngagementTrend('30d');
      });

      expect(trend).toEqual(mockTrend);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/trend?period=30d',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should support different trend periods', async () => {
      const mockTrend = {
        data: Array(7).fill(null).map((_, i) => ({
          date: `2026-07-${8 + i}`,
          engagement: Math.floor(Math.random() * 20),
        })),
        period: '7d',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrend,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      await act(async () => {
        await result.current.getEngagementTrend('7d');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=7d'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('getTopPosts', () => {
    it('should fetch top 5 posts by engagement', async () => {
      const mockTopPosts = [
        {
          id: 'post-1',
          title: 'First Post',
          engagementCount: 150,
          author: 'alice',
        },
        {
          id: 'post-2',
          title: 'Second Post',
          engagementCount: 120,
          author: 'bob',
        },
        {
          id: 'post-3',
          title: 'Third Post',
          engagementCount: 95,
          author: 'charlie',
        },
        {
          id: 'post-4',
          title: 'Fourth Post',
          engagementCount: 80,
          author: 'dave',
        },
        {
          id: 'post-5',
          title: 'Fifth Post',
          engagementCount: 65,
          author: 'eve',
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTopPosts,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      let posts;
      await act(async () => {
        posts = await result.current.getTopPosts('30d');
      });

      expect(posts).toEqual(mockTopPosts);
      expect(posts.length).toBe(5);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/top-posts?period=30d&limit=5',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return posts in engagement ranking order', async () => {
      const mockTopPosts = [
        { id: 'post-1', title: 'Most Engaged', engagementCount: 200, author: 'alice' },
        { id: 'post-2', title: 'Second', engagementCount: 150, author: 'bob' },
        { id: 'post-3', title: 'Third', engagementCount: 100, author: 'charlie' },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTopPosts,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      let posts;
      await act(async () => {
        posts = await result.current.getTopPosts('30d');
      });

      expect(posts[0].engagementCount).toBeGreaterThanOrEqual(posts[1].engagementCount);
      expect(posts[1].engagementCount).toBeGreaterThanOrEqual(posts[2].engagementCount);
    });

    it('should support different time periods for top posts', async () => {
      const mockTopPosts = [];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTopPosts,
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      await act(async () => {
        await result.current.getTopPosts('90d');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=90d'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle metrics fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      await act(async () => {
        try {
          await result.current.getDashboardMetrics('30d');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Server error');
        }
      });
    });

    it('should handle trend fetch error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error' } }),
      });

      const { result } = renderHook(() => useAnalytics(mockUserId));

      await act(async () => {
        try {
          await result.current.getEngagementTrend('30d');
          expect.fail('Should throw error');
        } catch (error: any) {
          expect(error.message).toContain('Server error');
        }
      });
    });
  });
});
