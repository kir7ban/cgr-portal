import React, { useState, useCallback } from 'react';

export interface MediaItem {
  type: 'image' | 'video' | 'document';
  url: string;
  filename?: string;
}

interface MediaUploadProps {
  onMediaChange: (media: MediaItem[]) => void;
  initialMedia?: MediaItem[];
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 3;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function MediaUpload({ onMediaChange, initialMedia = [] }: MediaUploadProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newFiles = Array.from(files);
      const errors: string[] = [];

      // Check total images limit
      if (media.filter(m => m.type === 'image').length + newFiles.length > MAX_IMAGES) {
        errors.push(`Maximum ${MAX_IMAGES} images allowed`);
      }

      // Validate each file
      newFiles.forEach((file) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          errors.push(`Invalid image type: ${file.name}`);
        }
        if (file.size > MAX_IMAGE_SIZE) {
          errors.push(`Image too large: ${file.name} (max 5MB)`);
        }
      });

      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      // Upload files
      newFiles.forEach((file) => {
        setUploadProgress(0);
        const reader = new FileReader();
        reader.onload = () => {
          const newMedia: MediaItem = {
            type: 'image',
            url: reader.result as string,
            filename: file.name,
          };
          setMedia((prev) => {
            const updated = [...prev, newMedia];
            onMediaChange(updated);
            setUploadProgress(null);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      });
      setError(null);
    },
    [media, onMediaChange]
  );

  const handleVideoUrl = useCallback(() => {
    if (!videoUrl.trim()) {
      setError('Please enter a video URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      setError('Invalid video URL format');
      return;
    }

    const newMedia: MediaItem = {
      type: 'video',
      url: videoUrl,
      filename: videoUrl,
    };

    setMedia((prev) => {
      const updated = [...prev, newMedia];
      onMediaChange(updated);
      setVideoUrl('');
      setError(null);
      return updated;
    });
  }, [videoUrl, onMediaChange]);

  const handleDocumentUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newFiles = Array.from(files);
      const errors: string[] = [];

      // Validate each file
      newFiles.forEach((file) => {
        if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
          errors.push(`Invalid document type: ${file.name}`);
        }
        if (file.size > MAX_DOCUMENT_SIZE) {
          errors.push(`Document too large: ${file.name} (max 10MB)`);
        }
      });

      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      // Upload files
      newFiles.forEach((file) => {
        setUploadProgress(0);
        const reader = new FileReader();
        reader.onload = () => {
          const newMedia: MediaItem = {
            type: 'document',
            url: reader.result as string,
            filename: file.name,
          };
          setMedia((prev) => {
            const updated = [...prev, newMedia];
            onMediaChange(updated);
            setUploadProgress(null);
            return updated;
          });
        };
        reader.readAsDataURL(file);
      });
      setError(null);
    },
    [onMediaChange]
  );

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onMediaChange(updated);
      return updated;
    });
  };

  const imageCount = media.filter(m => m.type === 'image').length;

  return (
    <div className="media-upload">
      <h3>Upload Media</h3>

      {error && <div className="error-message">{error}</div>}

      {/* Images Section */}
      <div className="media-section">
        <label htmlFor="images">Images ({imageCount}/{MAX_IMAGES})</label>
        <p className="help-text">
          Images: PNG, JPEG, GIF, WebP | Max 5MB per image | Max 3 images
        </p>
        <input
          id="images"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleImageUpload}
          disabled={imageCount >= MAX_IMAGES}
          aria-label="Images"
        />
        <button
          onClick={() => document.getElementById('images')?.click()}
          disabled={imageCount >= MAX_IMAGES}
          className="upload-button"
        >
          Add Images
        </button>
      </div>

      {/* Video Section */}
      <div className="media-section">
        <label htmlFor="video-url">Video URL</label>
        <p className="help-text">
          Supports YouTube links or direct video URLs
        </p>
        <input
          id="video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=... or https://example.com/video.mp4"
          aria-label="Video URL"
        />
        <button
          onClick={handleVideoUrl}
          className="upload-button"
        >
          Add Video
        </button>
      </div>

      {/* Documents Section */}
      <div className="media-section">
        <label htmlFor="documents">Documents</label>
        <p className="help-text">
          PDF, Word, Excel | Max 10MB per file
        </p>
        <input
          id="documents"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleDocumentUpload}
          aria-label="Documents"
        />
        <button
          onClick={() => document.getElementById('documents')?.click()}
          className="upload-button"
        >
          Add Documents
        </button>
      </div>

      {/* Progress Bar */}
      {uploadProgress !== null && (
        <div className="upload-progress">
          <div
            className="progress-bar"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Media Preview */}
      {media.length > 0 && (
        <div className="media-preview">
          <h4>Attached Media ({media.length})</h4>
          <div className="media-items">
            {media.map((item, index) => (
              <div key={index} className="media-item">
                {item.type === 'image' && (
                  <img
                    src={item.url}
                    alt={item.filename || 'uploaded image'}
                    className="media-thumbnail"
                  />
                )}
                {item.type === 'video' && (
                  <div className="media-video-icon">
                    ▶️ {item.filename}
                  </div>
                )}
                {item.type === 'document' && (
                  <div className="media-doc-icon">
                    📄 {item.filename}
                  </div>
                )}
                <button
                  onClick={() => handleRemoveMedia(index)}
                  className="remove-button"
                  aria-label={`Remove ${item.filename}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
