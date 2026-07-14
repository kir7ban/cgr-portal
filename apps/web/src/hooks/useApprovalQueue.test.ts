import { renderHook, waitFor } from '@testing-library/react';
import { useApprovalQueue } from './useApprovalQueue';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #10 - useApprovalQueue Hook
 */

describe('useApprovalQueue Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch approval queue on mount', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING' as const,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    const { result } = renderHook(() => useApprovalQueue());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.submissions).toHaveLength(1);
    expect(result.current.submissions[0].createdBy).toBe('alice');
  });

  it('should sort submissions by submission date (oldest first)', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING' as const,
        },
        {
          id: 'submission-2',
          postId: 'post-2',
          createdBy: 'bob',
          submittedAt: '2026-07-14T08:00:00Z',
          state: 'PENDING' as const,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    const { result } = renderHook(() => useApprovalQueue());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Bob's submission (08:00) should come before alice's (10:00)
    expect(result.current.submissions[0].createdBy).toBe('bob');
    expect(result.current.submissions[1].createdBy).toBe('alice');
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Server error' } }),
    });

    const { result } = renderHook(() => useApprovalQueue());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.submissions).toHaveLength(0);
  });

  it('should provide refresh method to re-fetch queue', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING' as const,
        },
      ],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockQueue,
          data: [
            ...mockQueue.data,
            {
              id: 'submission-2',
              postId: 'post-2',
              createdBy: 'bob',
              submittedAt: '2026-07-14T11:00:00Z',
              state: 'PENDING' as const,
            },
          ],
        }),
      });

    const { result } = renderHook(() => useApprovalQueue());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.submissions).toHaveLength(1);

    // Call refresh
    result.current.refresh();

    await waitFor(() => {
      expect(result.current.submissions).toHaveLength(2);
    });
  });
});
