import { useState, useCallback } from 'react';

export interface Member {
  id: string;
  username: string;
  email: string;
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: string;
}

/**
 * Hook for managing custom audiences
 * Handles CRUD operations and member management
 *
 * @param userId - The ID of the current user
 * @returns Object with methods to manage audiences
 */
export function useAudiences(userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new audience
   */
  const createAudience = useCallback(
    async (name: string, description: string): Promise<Audience> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/audiences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, description }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create audience');
        }

        const audience = await response.json();
        return audience;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create audience';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get list of all audiences
   */
  const getAudiences = useCallback(async (): Promise<Audience[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/audiences', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch audiences');
      }

      const audiences = await response.json();
      return audiences;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audiences';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update audience details
   */
  const updateAudience = useCallback(
    async (
      audienceId: string,
      name: string,
      description: string
    ): Promise<Audience> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audiences/${audienceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, description }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to update audience');
        }

        const audience = await response.json();
        return audience;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update audience';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete an audience
   */
  const deleteAudience = useCallback(
    async (audienceId: string): Promise<{ deleted: true }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audiences/${audienceId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to delete audience');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete audience';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Add a member to an audience
   */
  const addMember = useCallback(
    async (
      audienceId: string,
      memberId: string
    ): Promise<{ success: true; memberAdded: true }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audiences/${audienceId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: memberId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to add member');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add member';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Remove a member from an audience
   */
  const removeMember = useCallback(
    async (
      audienceId: string,
      memberId: string
    ): Promise<{ success: true; memberRemoved: true }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audiences/${audienceId}/members/${memberId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to remove member');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get members of an audience
   */
  const getMembers = useCallback(
    async (audienceId: string): Promise<Member[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audiences/${audienceId}/members`, {
          method: 'GET',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch members');
        }

        const members = await response.json();
        return members;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch members';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    createAudience,
    getAudiences,
    updateAudience,
    deleteAudience,
    addMember,
    removeMember,
    getMembers,
    isLoading,
    error,
  };
}
