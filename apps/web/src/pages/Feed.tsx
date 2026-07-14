import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';

interface FeedPost {
  id: string;
  text: string;
  images?: string[];
  createdAt: string;
  createdBy: string;
  state: string;
}

interface FeedResponse {
  items: FeedPost[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function Feed() {
  const { currentUser } = useAuthContext();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFeed();
  }, [pageNumber]);

  const fetchFeed = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts?page=${pageNumber}&pageSize=20`);

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load feed');
        return;
      }

      const data: FeedResponse = await response.json();
      setPosts(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError('Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="feed-container">Loading...</div>;
  }

  if (error) {
    return <div className="feed-container error">{error}</div>;
  }

  return (
    <div className="feed-container">
      <h1>Feed</h1>

      <div className="posts-list">
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <span className="author">{post.createdBy}</span>
              <span className="timestamp">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="post-content">{post.text}</div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber === 1}>
          Previous
        </button>
        <span>Page {pageNumber} of {totalPages}</span>
        <button onClick={() => setPageNumber(p => p + 1)} disabled={pageNumber >= totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
