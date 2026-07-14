import { useState, useCallback } from 'react';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface CommentsResponse {
  items: Comment[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

/**
 * Hook for managing post comments
 * Handles adding, fetching (with pagination), and deleting comments
 *
 * @param postId - The ID of the post
 * @param userId - The ID of the current user
 * @returns Object with methods to manage comments
 */
export function useComments(postId: string, userId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add a comment to the post
   */
  const addComment = useCallback(
    async (text: string): Promise<Comment> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to add comment');
        }

        const comment = await response.json();
        return comment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add comment';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  /**
   * Get comments for the post with pagination (5 per page)
   * Comments returned in chronological order (oldest first)
   */
  const getComments = useCallback(
    async (page: number = 1, pageSize: number = 5): Promise<CommentsResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/posts/${postId}/comments?page=${page}&pageSize=${pageSize}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to fetch comments');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch comments';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  /**
   * Delete a comment
   * Author can delete own, admin can delete any
   */
  const deleteComment = useCallback(
    async (commentId: string): Promise<{ deleted: true }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/posts/${postId}/comments/${commentId}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to delete comment');
        }

        const result = await response.json();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete comment';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [postId]
  );

  return {
    addComment,
    getComments,
    deleteComment,
    isLoading,
    error,
  };
}
