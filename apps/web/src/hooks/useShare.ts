import { useState, useCallback } from 'react';

export interface ShareResponse {
  sharedWith: number;
  message: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  memberCount: number;
}

/**
 * Hook for sharing posts internally with users and groups
 * Handles share flow with recipient selection
 *
 * @param postId - The ID of the post
 * @param userId - The ID of the current user
 * @returns Object with methods for sharing
 */
export function useShare(postId: string, userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Share a post with specified recipients
   * Returns count of recipients for toast notification
   */
  const sharePost = useCallback(
    async (recipients: string[]): Promise<ShareResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/posts/${postId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recipients }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to share post');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to share post';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  /**
   * Get list of users for recipient selection
   */
  const getUsers = useCallback(async (): Promise<User[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch users');
      }

      const users = await response.json();
      return users;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get list of groups for recipient selection
   */
  const getGroups = useCallback(async (): Promise<Group[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/groups', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch groups');
      }

      const groups = await response.json();
      return groups;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch groups';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sharePost,
    getUsers,
    getGroups,
    isLoading,
    error,
  };
}
