import { useState, useCallback } from 'react';

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  userReacted: boolean;
}

/**
 * Hook for managing post reactions (emoji reactions)
 * Handles adding, removing, and fetching aggregated reactions
 *
 * @param postId - The ID of the post
 * @param userId - The ID of the current user
 * @returns Object with methods to manage reactions
 */
export function useReactions(postId: string, userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add a reaction emoji to the post
   */
  const addReaction = useCallback(
    async (emoji: string): Promise<Reaction> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emoji, userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to add reaction');
        }

        const reaction = await response.json();
        return reaction;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add reaction';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [postId, userId]
  );

  /**
   * Remove a reaction from the post
   */
  const removeReaction = useCallback(
    async (reactionId: string): Promise<{ deleted: true }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/posts/${postId}/reactions/${reactionId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to remove reaction');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove reaction';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  /**
   * Get aggregated reactions for the post (emoji + count format)
   */
  const getReactions = useCallback(async (): Promise<ReactionCount[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/reactions?userId=${userId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch reactions');
      }

      const reactions = await response.json();
      return reactions;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reactions';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [postId, userId]);

  return {
    addReaction,
    removeReaction,
    getReactions,
    isLoading,
    error,
  };
}
