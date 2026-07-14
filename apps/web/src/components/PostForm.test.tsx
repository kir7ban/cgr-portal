import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostForm } from './PostForm';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: PostForm Component
 *
 * Integrated component testing for post creation with media and audience
 */

describe('PostForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Behavior #1: Form integration with all sections', () => {
    it('should render text input section', () => {
      const mockOnSubmit = vi.fn();
      render(<PostForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/post content/i)).toBeInTheDocument();
    });

    it('should render media upload section', () => {
      const mockOnSubmit = vi.fn();
      render(<PostForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/upload media/i)).toBeInTheDocument();
    });

    it('should render audience selector section', () => {
      const mockOnSubmit = vi.fn();
      render(<PostForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/select audience/i)).toBeInTheDocument();
    });
  });

  describe('Behavior #2: Collect all form data', () => {
    it('should collect text content, media, and audience in one submission', async () => {
      const mockOnSubmit = vi.fn();
      render(<PostForm onSubmit={mockOnSubmit} />);

      // Fill text
      const textInput = screen.getByLabelText(/post content/i);
      fireEvent.change(textInput, { target: { value: 'This is my post content' } });

      // Select audience
      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'This is my post content',
            media: expect.any(Array),
            audienceType: 'ORG_WIDE',
          })
        );
      });
    });
  });

  describe('Behavior #3: Form validation', () => {
    it('should validate text is required', async () => {
      const mockOnSubmit = vi.fn();
      render(<PostForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/text is required/i)).toBeInTheDocument();
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });
});
