import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface PostCreatePayload {
  content: string;
  media: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
    filename?: string;
  }>;
}

export interface CreatePostResponse {
  id: string;
  content: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  createdAt: string;
}

export function usePostCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const createPost = useCallback(
    async (payload: PostCreatePayload): Promise<CreatePostResponse | null> => {
      if (!currentUser) {
        setError('You must be logged in to create a post');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.error?.message || 'Failed to create post';
          setError(errorMsg);
          setIsLoading(false);
          return null;
        }

        const result = await response.json();
        setIsLoading(false);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        setIsLoading(false);
        return null;
      }
    },
    [currentUser]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createPost,
    isLoading,
    error,
    clearError,
  };
}
