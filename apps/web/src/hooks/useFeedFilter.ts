import { useMemo } from 'react';

export interface FeedPost {
  id: string;
  text: string;
  proposedAudience?: string;
  approvedAudience?: string;
  createdAt: string;
  createdBy: string;
  state: string;
}

export interface UseFeedFilterReturn {
  filterByAudience: (userAudiences: string[]) => FeedPost[];
  search: (query: string) => FeedPost[];
}

/**
 * useFeedFilter Hook: Client-side filtering for feed posts
 *
 * Public interface:
 * - filterByAudience(userAudiences): Filter posts by user's audience access
 * - search(query): Search posts by text content
 */
export function useFeedFilter(posts: FeedPost[]): UseFeedFilterReturn {
  const filterByAudience = useMemo(
    () => (userAudiences: string[]) => {
      return posts.filter((post) => {
        // Exclude revoked and archived posts
        if (post.state === 'REVOKED' || post.state === 'ARCHIVED') {
          return false;
        }

        const audience = post.approvedAudience || post.proposedAudience;

        // If no audience, visible to all (org-wide default)
        if (!audience) {
          return true;
        }

        // org-wide visible to everyone
        if (audience === 'org-wide') {
          return true;
        }

        // Check if user belongs to audience
        return userAudiences.includes(audience);
      });
    },
    [posts]
  );

  const search = useMemo(
    () => (query: string) => {
      if (!query.trim()) {
        return posts;
      }

      const lowerQuery = query.toLowerCase();
      return posts.filter((post) => post.text.toLowerCase().includes(lowerQuery));
    },
    [posts]
  );

  return {
    filterByAudience,
    search,
  };
}
