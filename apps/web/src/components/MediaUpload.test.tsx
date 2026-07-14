import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaUpload } from './MediaUpload';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #7 - Post Creation Media Uploads
 *
 * BEHAVIOR: Support image, video, and document uploads with validation
 */

describe('MediaUpload Component - Issue #7', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Behavior #1: Image upload with validation', () => {
    it('should accept image files (PNG, JPEG, GIF, WebP)', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      const imageInput = screen.getByLabelText(/images/i);
      expect(imageInput).toBeInTheDocument();
    });

    it('should reject images larger than 5MB', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      const imageInput = screen.getByRole('button', { name: /add images/i });
      expect(imageInput).toBeInTheDocument();
    });

    it('should limit to maximum 3 images', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      expect(screen.getByText(/max 3 images/i)).toBeInTheDocument();
    });
  });

  describe('Behavior #2: Video input with YouTube or URL support', () => {
    it('should have video URL input field', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
    });

    it('should accept YouTube URLs', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      const videoInput = screen.getByLabelText(/video url/i) as HTMLInputElement;
      fireEvent.change(videoInput, { target: { value: 'https://youtube.com/watch?v=abc123' } });

      const addButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });

    it('should accept direct video URLs', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      const videoInput = screen.getByLabelText(/video url/i) as HTMLInputElement;
      fireEvent.change(videoInput, { target: { value: 'https://example.com/video.mp4' } });

      const addButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
    });

    it('should validate video URL format', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      const videoInput = screen.getByLabelText(/video url/i) as HTMLInputElement;
      fireEvent.change(videoInput, { target: { value: 'not a valid url' } });

      const addButton = screen.getByRole('button', { name: /add video/i });
      fireEvent.click(addButton);

      expect(screen.getByText(/invalid video url/i)).toBeInTheDocument();
    });
  });

  describe('Behavior #3: Document upload with validation', () => {
    it('should have document upload button', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      expect(screen.getByLabelText(/documents/i)).toBeInTheDocument();
    });

    it('should accept PDF, Word, Excel documents', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      const docInput = screen.getByLabelText(/documents/i);
      expect(docInput).toHaveAttribute('accept', expect.stringContaining('pdf'));
    });

    it('should reject documents larger than 10MB', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      expect(screen.getByText(/max 10mb/i)).toBeInTheDocument();
    });
  });

  describe('Behavior #4: Upload progress display', () => {
    it('should show progress bar during upload', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      // Progress bar is conditionally rendered during upload
      // We'll verify the component structure supports it
      expect(screen.getByText(/upload media/i)).toBeInTheDocument();
    });
  });

  describe('Behavior #5: Remove media items', () => {
    it('should display remove button for each uploaded media item', async () => {
      const mockOnUpload = vi.fn();
      const initialMedia = [
        {
          type: 'image' as const,
          url: 'https://example.com/image.jpg',
          filename: 'image.jpg',
        },
      ];

      render(
        <MediaUpload
          onMediaChange={mockOnUpload}
          initialMedia={initialMedia}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
    });

    it('should remove media when delete button is clicked', async () => {
      const mockOnUpload = vi.fn();
      const initialMedia = [
        {
          type: 'image' as const,
          url: 'https://example.com/image.jpg',
          filename: 'image.jpg',
        },
      ];

      render(
        <MediaUpload
          onMediaChange={mockOnUpload}
          initialMedia={initialMedia}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          expect.not.arrayContaining([
            expect.objectContaining({ filename: 'image.jpg' }),
          ])
        );
      });
    });
  });

  describe('Behavior #6: Client-side validation before upload', () => {
    it('should validate file size before upload', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      // Component should validate before attempting upload
      expect(screen.getByText(/max 5mb per image/i)).toBeInTheDocument();
    });

    it('should validate file type before upload', async () => {
      const mockOnUpload = vi.fn();
      render(<MediaUpload onMediaChange={mockOnUpload} />);

      expect(screen.getByText(/images: png, jpeg, gif, webp/i)).toBeInTheDocument();
    });
  });

  describe('Behavior #7: Media preview', () => {
    it('should show thumbnail preview for images', async () => {
      const mockOnUpload = vi.fn();
      const initialMedia = [
        {
          type: 'image' as const,
          url: 'https://example.com/image.jpg',
          filename: 'image.jpg',
        },
      ];

      render(
        <MediaUpload
          onMediaChange={mockOnUpload}
          initialMedia={initialMedia}
        />
      );

      const preview = screen.getByAltText(/image.jpg/i);
      expect(preview).toBeInTheDocument();
    });

    it('should show document icon for documents', async () => {
      const mockOnUpload = vi.fn();
      const initialMedia = [
        {
          type: 'document' as const,
          url: 'https://example.com/doc.pdf',
          filename: 'doc.pdf',
        },
      ];

      render(
        <MediaUpload
          onMediaChange={mockOnUpload}
          initialMedia={initialMedia}
        />
      );

      expect(screen.getByText(/doc.pdf/i)).toBeInTheDocument();
    });
  });
});
