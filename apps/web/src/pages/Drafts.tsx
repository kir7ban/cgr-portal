import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Draft {
  id: string;
  content: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  createdAt: string;
}

export function Drafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    if (!currentUser) {
      setError('You must be logged in to view drafts');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/posts?status=DRAFT', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError('Failed to load drafts');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setDrafts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (draftId: string) => {
    navigate(`/posts/${draftId}/edit`);
  };

  const handleSubmit = (draftId: string) => {
    navigate(`/posts/${draftId}/submit`);
  };

  const handleDelete = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/posts/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadDrafts();
      } else {
        setError('Failed to delete draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="drafts-container">
      <h1>Draft Posts</h1>

      {error && <div className="error-message">{error}</div>}

      {isLoading ? (
        <div className="loading">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="empty-state">
          <p>No draft posts yet.</p>
          <button onClick={() => navigate('/posts/create')} className="create-button">
            Create New Post
          </button>
        </div>
      ) : (
        <div className="drafts-list">
          {drafts.map((draft) => (
            <div key={draft.id} className="draft-item">
              <div className="draft-content">
                <p className="draft-text">{draft.content}</p>
                <p className="draft-date">{formatDate(draft.createdAt)}</p>
              </div>
              <div className="draft-actions">
                <button
                  onClick={() => handleEdit(draft.id)}
                  className="edit-button"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleSubmit(draft.id)}
                  className="submit-button"
                >
                  Submit
                </button>
                <button
                  onClick={() => handleDelete(draft.id)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
