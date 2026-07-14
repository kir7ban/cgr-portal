import { useState, useCallback } from 'react';

export interface DashboardMetrics {
  totalEngagement: number;
  submissionVolume: number;
  approvalTime: number;
  timestamp: string;
}

export interface EngagementTrendData {
  date: string;
  engagement: number;
}

export interface EngagementTrend {
  data: EngagementTrendData[];
  period: string;
}

export interface TopPost {
  id: string;
  title: string;
  engagementCount: number;
  author: string;
}

/**
 * Hook for accessing analytics dashboard
 * Handles fetching metrics, trends, and top performing posts
 *
 * @param userId - The ID of the current user
 * @returns Object with methods to fetch analytics data
 */
export function useAnalytics(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get dashboard metrics (engagement, submissions, approval time)
   */
  const getDashboardMetrics = useCallback(
    async (period: '7d' | '30d' | '90d' = '30d'): Promise<DashboardMetrics> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analytics/dashboard?period=${period}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch metrics');
        }

        const metrics = await response.json();
        return metrics;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch metrics';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get engagement trend data for line chart
   */
  const getEngagementTrend = useCallback(
    async (period: '7d' | '30d' | '90d' = '30d'): Promise<EngagementTrend> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analytics/trend?period=${period}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch trend');
        }

        const trend = await response.json();
        return trend;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch trend';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get top 5 posts by engagement
   */
  const getTopPosts = useCallback(
    async (
      period: '7d' | '30d' | '90d' = '30d',
      limit: number = 5
    ): Promise<TopPost[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/analytics/top-posts?period=${period}&limit=${limit}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch top posts');
        }

        const posts = await response.json();
        return posts;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch top posts';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getDashboardMetrics,
    getEngagementTrend,
    getTopPosts,
    isLoading,
    error,
  };
}
