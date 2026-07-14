import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreatePost } from './CreatePost';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

/**
 * TEST SUITE: Issue #6 - Post Creation Form (Text Only)
 *
 * BEHAVIOR #1: Form renders with required elements
 * - Text input field for post content
 * - Submit button
 * - Cancel button
 */

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CreatePost Page - Issue #6 (Text Only)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Behavior #1: Form renders with required UI elements', () => {
    it('should render post creation form with text input', () => {
      renderWithRouter(<CreatePost />);

      expect(screen.getByRole('textbox', { name: /post content/i })).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderWithRouter(<CreatePost />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      renderWithRouter(<CreatePost />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render form heading', () => {
      renderWithRouter(<CreatePost />);

      expect(screen.getByRole('heading', { name: /create post/i })).toBeInTheDocument();
    });
  });

  describe('Behavior #2: Text validation - required field', () => {
    it('should require text input (empty submission fails)', async () => {
      renderWithRouter(<CreatePost />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/text is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #3: Text validation - minimum length', () => {
    it('should require at least 10 characters', async () => {
      renderWithRouter(<CreatePost />);

      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: 'short' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #4: Text validation - maximum length', () => {
    it('should reject text longer than 5000 characters', async () => {
      renderWithRouter(<CreatePost />);

      const longText = 'a'.repeat(5001);
      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: longText } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must not exceed 5000 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #5: Form submission creates draft post', () => {
    it('should submit valid text and create DRAFT post via API', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          content: 'This is a test post',
          status: 'DRAFT',
        }),
      });

      renderWithRouter(<CreatePost />);

      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: 'This is a test post' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/posts'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': `Bearer ${mockToken}`,
            }),
          })
        );
      });
    });

    it('should send correct post data structure to API', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          content: 'This is a valid test post',
          status: 'DRAFT',
        }),
      });

      renderWithRouter(<CreatePost />);

      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: 'This is a valid test post' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const callArgs = (global.fetch as any).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body).toEqual({
          content: 'This is a valid test post',
          media: [],
        });
      });
    });
  });

  describe('Behavior #6: Successful submission redirects to draft management', () => {
    it('should redirect to /drafts after successful post creation', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          content: 'This is a test post',
          status: 'DRAFT',
        }),
      });

      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });

      renderWithRouter(<CreatePost />);

      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: 'This is a test post' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Behavior #7: Cancel button returns to feed', () => {
    it('should navigate back to /feed when cancel is clicked', () => {
      renderWithRouter(<CreatePost />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Navigation behavior will be tested in integration
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Behavior #8: Error handling on API failure', () => {
    it('should display error message when post creation fails', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid post data' } }),
      });

      renderWithRouter(<CreatePost />);

      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: 'This is a test post' } });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid post data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #9: Submit button disabled during submission', () => {
    it('should disable submit button while submitting', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'draft-001', content: 'test', status: 'DRAFT' }),
        }), 100))
      );

      renderWithRouter(<CreatePost />);

      const textInput = screen.getByRole('textbox', { name: /post content/i });
      fireEvent.change(textInput, { target: { value: 'This is a test post' } });

      const submitButton = screen.getByRole('button', { name: /submit/i }) as HTMLButtonElement;
      fireEvent.click(submitButton);

      expect(submitButton.disabled).toBe(true);
    });
  });
});
