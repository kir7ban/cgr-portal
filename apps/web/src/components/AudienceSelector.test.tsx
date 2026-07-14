import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudienceSelector } from './AudienceSelector';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

/**
 * TEST SUITE: Issue #8 - Post Creation Audience Selection & Submission
 *
 * BEHAVIOR: Select audience and submit post for approval
 */

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AudienceSelector Component - Issue #8', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Behavior #1: Audience selection radio buttons', () => {
    it('should display three audience options', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/organization-wide/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/department only/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom audience/i)).toBeInTheDocument();
    });

    it('should allow selecting org-wide audience', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      expect((orgOption as HTMLInputElement).checked).toBe(true);
    });

    it('should allow selecting department-only audience', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const deptOption = screen.getByLabelText(/department only/i);
      fireEvent.click(deptOption);

      expect((deptOption as HTMLInputElement).checked).toBe(true);
    });

    it('should allow selecting custom audience', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const customOption = screen.getByLabelText(/custom audience/i);
      fireEvent.click(customOption);

      expect((customOption as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('Behavior #2: Custom audience selector', () => {
    it('should show custom audience input when custom option is selected', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const customOption = screen.getByLabelText(/custom audience/i);
      fireEvent.click(customOption);

      expect(screen.getByText(/select departments/i)).toBeInTheDocument();
    });

    it('should allow selecting multiple departments', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const customOption = screen.getByLabelText(/custom audience/i);
      fireEvent.click(customOption);

      const deptCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(deptCheckbox);

      expect((deptCheckbox as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('Behavior #3: Submit for approval button', () => {
    it('should display submit button', () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
    });

    it('should submit with selected audience', async () => {
      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      const submitButton = screen.getByRole('button', { name: /submit for approval/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            postId: 'draft-001',
            audienceType: 'ORG_WIDE',
          })
        );
      });
    });
  });

  describe('Behavior #4: Submit to API endpoint', () => {
    it('should call POST /api/posts/{id}/submit with audience data', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          status: 'SUBMITTED',
        }),
      });

      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      const submitButton = screen.getByRole('button', { name: /submit for approval/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/posts/draft-001/submit'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': `Bearer ${mockToken}`,
            }),
          })
        );
      });
    });
  });

  describe('Behavior #5: Success notification', () => {
    it('should show success message after submission', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-001',
          status: 'SUBMITTED',
        }),
      });

      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      const submitButton = screen.getByRole('button', { name: /submit for approval/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully submitted/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #6: Error handling', () => {
    it('should display error message on submission failure', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid audience' } }),
      });

      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      const submitButton = screen.getByRole('button', { name: /submit for approval/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid audience/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #7: Loading state during submission', () => {
    it('should disable submit button while submitting', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ id: 'draft-001', status: 'SUBMITTED' }),
        }), 100))
      );

      const mockOnSubmit = vi.fn();
      renderWithRouter(<AudienceSelector postId="draft-001" onSubmit={mockOnSubmit} />);

      const orgOption = screen.getByLabelText(/organization-wide/i);
      fireEvent.click(orgOption);

      const submitButton = screen.getByRole('button', { name: /submit for approval/i }) as HTMLButtonElement;
      fireEvent.click(submitButton);

      expect(submitButton.disabled).toBe(true);
    });
  });
});
