import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePostCreation } from '../hooks/usePostCreation';

export function CreatePost() {
  const [content, setContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { createPost, isLoading, error, clearError } = usePostCreation();

  const validateContent = (): boolean => {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Text is required');
    } else if (content.trim().length < 10) {
      errors.push('Text must be at least 10 characters');
    } else if (content.length > 5000) {
      errors.push('Text must not exceed 5000 characters');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateContent()) {
      return;
    }

    const result = await createPost({
      content,
      media: [],
    });

    if (result) {
      navigate('/drafts');
    }
  };

  const handleCancel = () => {
    navigate('/feed');
  };

  return (
    <div className="create-post-container">
      <h1>Create Post</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="post-content">Post Content</label>
          <textarea
            id="post-content"
            aria-label="Post Content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setValidationErrors([]);
            }}
            placeholder="Write your post here... (10-5000 characters)"
            maxLength={5000}
            rows={6}
          />
          <div className="character-count">
            {content.length} / 5000
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            {validationErrors.map((err, idx) => (
              <div key={idx} className="validation-error">
                {err}
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
