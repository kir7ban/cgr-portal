import { renderHook, waitFor } from '@testing-library/react';
import { usePostManagement } from './usePostManagement';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #13 - Post Lifecycle - Edit & Re-approval
 * TEST SUITE: Issue #14 - Post Lifecycle - Revoke & Archive
 */

describe('usePostManagement Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Issue #13 Tests
  it('should fetch post by ID for editing', async () => {
    const mockPost = {
      id: 'post-1',
      text: 'Original post content',
      createdBy: 'alice',
      state: 'PUBLISHED',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPost,
    });

    const { result } = renderHook(() => usePostManagement());

    const post = await result.current.fetchPost('post-1');

    expect(post).toEqual(mockPost);
    expect(global.fetch).toHaveBeenCalledWith('/api/posts/post-1');
  });

  it('should edit post and transition to SUBMITTED state', async () => {
    const updatedPost = {
      id: 'post-1',
      text: 'Updated post content',
      createdBy: 'alice',
      state: 'SUBMITTED',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => updatedPost,
    });

    const { result } = renderHook(() => usePostManagement());

    const post = await result.current.editPost('post-1', { text: 'Updated post content' });

    expect(post).toEqual(updatedPost);
    expect(post.state).toBe('SUBMITTED');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts/post-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ text: 'Updated post content' }),
      })
    );
  });

  it('should track revision history in audit trail', async () => {
    const updatedPost = {
      id: 'post-1',
      text: 'Updated post content',
      createdBy: 'alice',
      state: 'SUBMITTED',
      revisionCount: 2,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => updatedPost,
    });

    const { result } = renderHook(() => usePostManagement());

    const post = await result.current.editPost('post-1', { text: 'Updated post content' });

    expect(post.revisionCount).toBe(2);
  });

  // Issue #14 Tests
  it('should revoke a published post', async () => {
    const revokedPost = {
      id: 'post-1',
      text: 'Post content',
      createdBy: 'alice',
      state: 'REVOKED',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => revokedPost,
    });

    const { result } = renderHook(() => usePostManagement());

    const post = await result.current.revokePost('post-1', { reason: 'Contains error' });

    expect(post.state).toBe('REVOKED');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts/post-1/revoke',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Contains error' }),
      })
    );
  });

  it('should archive a post', async () => {
    const archivedPost = {
      id: 'post-1',
      text: 'Post content',
      createdBy: 'alice',
      state: 'ARCHIVED',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => archivedPost,
    });

    const { result } = renderHook(() => usePostManagement());

    const post = await result.current.archivePost('post-1');

    expect(post.state).toBe('ARCHIVED');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/posts/post-1/archive',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should fetch archived posts', async () => {
    const mockArchivedPosts = [
      {
        id: 'post-1',
        text: 'Archived post 1',
        createdBy: 'alice',
        state: 'ARCHIVED',
      },
      {
        id: 'post-2',
        text: 'Archived post 2',
        createdBy: 'bob',
        state: 'ARCHIVED',
      },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockArchivedPosts, totalCount: 2 }),
    });

    const { result } = renderHook(() => usePostManagement());

    const archivedPosts = await result.current.fetchArchivedPosts();

    expect(archivedPosts).toHaveLength(2);
    expect(archivedPosts[0].state).toBe('ARCHIVED');
  });

  it('should exclude archived posts from regular feed', async () => {
    const mockFeedPosts = [
      {
        id: 'post-1',
        text: 'Published post',
        createdBy: 'alice',
        state: 'PUBLISHED',
      },
    ];

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockFeedPosts, totalCount: 1 }),
    });

    const { result } = renderHook(() => usePostManagement());

    const feedPosts = await result.current.fetchFeedPosts();

    expect(feedPosts).toHaveLength(1);
    expect(feedPosts[0].state).toBe('PUBLISHED');
    expect(feedPosts.some(p => p.state === 'ARCHIVED')).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Server error' } }),
    });

    const { result } = renderHook(() => usePostManagement());

    const post = await result.current.fetchPost('post-1');

    expect(post).toBeNull();
  });
});
