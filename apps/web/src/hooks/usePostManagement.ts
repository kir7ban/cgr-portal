import { useCallback } from 'react';

export interface Post {
  id: string;
  text: string;
  createdBy: string;
  state: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REVOKED' | 'ARCHIVED' | 'REJECTED';
  revisionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsePostManagementReturn {
  fetchPost: (postId: string) => Promise<Post | null>;
  editPost: (postId: string, updates: Partial<Post>) => Promise<Post | null>;
  revokePost: (postId: string, data: { reason: string }) => Promise<Post | null>;
  archivePost: (postId: string) => Promise<Post | null>;
  fetchArchivedPosts: () => Promise<Post[]>;
  fetchFeedPosts: () => Promise<Post[]>;
}

export function usePostManagement(): UsePostManagementReturn {
  const fetchPost = useCallback(async (postId: string): Promise<Post | null> => {
    try {
      const response = await fetch(`/api/posts/${postId}`);

      if (!response.ok) {
        return null;
      }

      const post: Post = await response.json();
      return post;
    } catch (err) {
      return null;
    }
  }, []);

  const editPost = useCallback(
    async (postId: string, updates: Partial<Post>): Promise<Post | null> => {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          return null;
        }

        const post: Post = await response.json();
        return post;
      } catch (err) {
        return null;
      }
    },
    []
  );

  const revokePost = useCallback(
    async (postId: string, data: { reason: string }): Promise<Post | null> => {
      try {
        const response = await fetch(`/api/posts/${postId}/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          return null;
        }

        const post: Post = await response.json();
        return post;
      } catch (err) {
        return null;
      }
    },
    []
  );

  const archivePost = useCallback(async (postId: string): Promise<Post | null> => {
    try {
      const response = await fetch(`/api/posts/${postId}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        return null;
      }

      const post: Post = await response.json();
      return post;
    } catch (err) {
      return null;
    }
  }, []);

  const fetchArchivedPosts = useCallback(async (): Promise<Post[]> => {
    try {
      const response = await fetch('/api/posts/archive?state=ARCHIVED');

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.items || [];
    } catch (err) {
      return [];
    }
  }, []);

  const fetchFeedPosts = useCallback(async (): Promise<Post[]> => {
    try {
      const response = await fetch('/api/posts?page=1&pageSize=20');

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.items || []).filter((post: Post) => post.state !== 'ARCHIVED');
    } catch (err) {
      return [];
    }
  }, []);

  return {
    fetchPost,
    editPost,
    revokePost,
    archivePost,
    fetchArchivedPosts,
    fetchFeedPosts,
  };
}
