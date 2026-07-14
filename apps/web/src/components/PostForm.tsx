import React, { useState } from 'react';
import { MediaItem, MediaUpload } from './MediaUpload';
import { AudienceSelector, AudienceSubmission } from './AudienceSelector';

export interface PostFormData {
  content: string;
  media: MediaItem[];
  audienceType: 'ORG_WIDE' | 'DEPT_ONLY' | 'CUSTOM';
  customDepartments?: string[];
}

interface PostFormProps {
  onSubmit: (data: PostFormData) => void;
  initialData?: Partial<PostFormData>;
}

export function PostForm({ onSubmit, initialData = {} }: PostFormProps) {
  const [content, setContent] = useState(initialData.content || '');
  const [media, setMedia] = useState<MediaItem[]>(initialData.media || []);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'content' | 'media' | 'audience'>('content');

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

  const handleContentNext = () => {
    if (validateContent()) {
      setStep('media');
    }
  };

  const handleMediaNext = () => {
    setStep('audience');
  };

  const handleAudienceSubmit = (submission: AudienceSubmission) => {
    onSubmit({
      content,
      media,
      audienceType: submission.audienceType,
      customDepartments: submission.customDepartments,
    });
  };

  return (
    <div className="post-form">
      {step === 'content' && (
        <div className="form-step">
          <h2>Create Post - Step 1: Content</h2>

          {validationErrors.length > 0 && (
            <div className="validation-errors">
              {validationErrors.map((err, idx) => (
                <div key={idx} className="validation-error">
                  {err}
                </div>
              ))}
            </div>
          )}

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
              rows={8}
            />
            <div className="character-count">
              {content.length} / 5000
            </div>
          </div>

          <div className="form-actions">
            <button onClick={handleContentNext} className="next-button">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'media' && (
        <div className="form-step">
          <h2>Create Post - Step 2: Media</h2>

          <MediaUpload onMediaChange={setMedia} initialMedia={media} />

          <div className="form-actions">
            <button onClick={() => setStep('content')} className="back-button">
              Back
            </button>
            <button onClick={handleMediaNext} className="next-button">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'audience' && (
        <div className="form-step">
          <h2>Create Post - Step 3: Audience</h2>

          <AudienceSelector
            postId="temp-id"
            onSubmit={handleAudienceSubmit}
          />

          <div className="form-actions">
            <button onClick={() => setStep('media')} className="back-button">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
