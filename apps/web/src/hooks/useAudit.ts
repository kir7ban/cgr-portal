import { useState, useCallback } from 'react';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
}

export interface AuditResponse {
  items: AuditEvent[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

/**
 * Hook for accessing and filtering audit trail
 * Handles fetching, searching, filtering, and sorting audit events
 *
 * @param userId - The ID of the current user
 * @returns Object with methods to manage audit trail
 */
export function useAudit(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get audit events with pagination (50 per page default)
   */
  const getAuditEvents = useCallback(
    async (page: number = 1, pageSize: number = 50): Promise<AuditResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/audit?page=${page}&pageSize=${pageSize}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch audit events');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch audit events';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Filter audit events by date range
   */
  const filterByDateRange = useCallback(
    async (startDate: string, endDate: string): Promise<AuditResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/audit?page=1&pageSize=50&startDate=${startDate}&endDate=${endDate}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to filter by date');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to filter by date';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Search audit events by actor (user name or ID)
   */
  const searchByActor = useCallback(
    async (actorQuery: string): Promise<AuditResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/audit?page=1&pageSize=50&actor=${encodeURIComponent(actorQuery)}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to search by actor');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search by actor';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Filter audit events by action type(s)
   */
  const filterByAction = useCallback(
    async (actions: string | string[]): Promise<AuditResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const actionParam = Array.isArray(actions)
          ? actions.join(',')
          : actions;

        const response = await fetch(
          `/api/audit?page=1&pageSize=50&action=${encodeURIComponent(actionParam)}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to filter by action');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to filter by action';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Sort audit events by column
   */
  const sortAuditEvents = useCallback(
    async (
      sortBy: string,
      sortOrder: 'asc' | 'desc' = 'asc'
    ): Promise<AuditResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/audit?page=1&pageSize=50&sortBy=${sortBy}&sortOrder=${sortOrder}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to sort audit events');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sort audit events';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getAuditEvents,
    filterByDateRange,
    searchByActor,
    filterByAction,
    sortAuditEvents,
    isLoading,
    error,
  };
}
