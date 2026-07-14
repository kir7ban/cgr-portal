import { renderHook, act } from '@testing-library/react';
import { useFeedFilter } from './useFeedFilter';
import { describe, it, expect, beforeEach } from 'vitest';

/**
 * TEST SUITE: Issue #4 & #5 - Feed Filtering & Search
 */

describe('useFeedFilter Hook - Audience Filtering & Search', () => {
  const mockPosts = [
    {
      id: '1',
      text: 'Important announcement',
      proposedAudience: 'org-wide',
      createdAt: '2026-07-14T10:00:00Z',
      createdBy: 'alice',
      state: 'PUBLISHED',
    },
    {
      id: '2',
      text: 'Engineering team update',
      proposedAudience: 'dept-only',
      createdAt: '2026-07-14T09:00:00Z',
      createdBy: 'bob',
      state: 'PUBLISHED',
    },
    {
      id: '3',
      text: 'Leadership meeting notes',
      proposedAudience: 'custom:executives',
      createdAt: '2026-07-14T08:00:00Z',
      createdBy: 'charlie',
      state: 'PUBLISHED',
    },
  ];

  describe('Issue #4: Audience Filtering', () => {
    it('should filter posts by org-wide audience', () => {
      const { result } = renderHook(() => useFeedFilter(mockPosts));

      const userAudiences = ['org-wide'];
      const filtered = result.current.filterByAudience(userAudiences);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should include all org-wide posts and dept-only for user in dept', () => {
      const { result } = renderHook(() => useFeedFilter(mockPosts));

      const userAudiences = ['org-wide', 'dept-only'];
      const filtered = result.current.filterByAudience(userAudiences);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '2']);
    });

    it('should exclude revoked and archived posts', () => {
      const postsWithRevoked = [
        ...mockPosts,
        {
          id: '4',
          text: 'Revoked post',
          proposedAudience: 'org-wide',
          createdAt: '2026-07-14T07:00:00Z',
          createdBy: 'dave',
          state: 'REVOKED',
        },
      ];

      const { result } = renderHook(() => useFeedFilter(postsWithRevoked));

      const userAudiences = ['org-wide', 'dept-only', 'custom:executives'];
      const filtered = result.current.filterByAudience(userAudiences);

      expect(filtered.map(p => p.state)).not.toContain('REVOKED');
    });
  });

  describe('Issue #5: Search & Discovery', () => {
    it('should search posts by text content', () => {
      const { result } = renderHook(() => useFeedFilter(mockPosts));

      const searchResults = result.current.search('announcement');

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('1');
    });

    it('should search case-insensitively', () => {
      const { result } = renderHook(() => useFeedFilter(mockPosts));

      const searchResults = result.current.search('ENGINEERING');

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('2');
    });

    it('should return all posts when search is empty', () => {
      const { result } = renderHook(() => useFeedFilter(mockPosts));

      const searchResults = result.current.search('');

      expect(searchResults).toHaveLength(mockPosts.length);
    });

    it('should return empty array when no matches found', () => {
      const { result } = renderHook(() => useFeedFilter(mockPosts));

      const searchResults = result.current.search('nonexistent');

      expect(searchResults).toHaveLength(0);
    });
  });
});
