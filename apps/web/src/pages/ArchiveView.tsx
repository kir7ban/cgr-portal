import React, { useState, useEffect } from 'react';

interface ArchivedPost {
  id: string;
  text: string;
  createdBy: string;
  state: 'ARCHIVED';
  createdAt: string;
}

interface ArchiveResponse {
  items: ArchivedPost[];
  totalCount: number;
}

export function ArchiveView() {
  const [posts, setPosts] = useState<ArchivedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedPosts();
  }, []);

  const fetchArchivedPosts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/posts/archive?state=ARCHIVED');

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load archived posts');
        return;
      }

      const data: ArchiveResponse = await response.json();
      setPosts(data.items);
    } catch (err) {
      setError('Failed to load archived posts');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="archive-container">Loading...</div>;
  }

  if (error) {
    return <div className="archive-container error">{error}</div>;
  }

  return (
    <div className="archive-container">
      <h1>Archived Posts</h1>

      {posts.length === 0 ? (
        <div className="empty-archive">No archived posts</div>
      ) : (
        <div className="archived-posts-list">
          {posts.map((post) => (
            <div key={post.id} className="archived-post-card">
              <div className="post-header">
                <span className="author">{post.createdBy}</span>
                <span className="timestamp">{formatDate(post.createdAt)}</span>
              </div>
              <div className="post-content">{post.text}</div>
              <div className="post-status">
                <span className="badge archived">ARCHIVED</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
