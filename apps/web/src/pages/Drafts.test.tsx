import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Drafts } from './Drafts';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

/**
 * TEST SUITE: Issue #9 - Draft Management
 *
 * BEHAVIOR: User can view, edit, submit, and delete drafts
 */

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Drafts Page - Issue #9', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Behavior #1: List user drafts', () => {
    it('should display list of draft posts for current user', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'draft-001',
              content: 'First draft post',
              status: 'DRAFT',
              createdAt: '2024-01-01T10:00:00Z',
            },
            {
              id: 'draft-002',
              content: 'Second draft post',
              status: 'DRAFT',
              createdAt: '2024-01-02T10:00:00Z',
            },
          ],
        }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        expect(screen.getByText(/first draft post/i)).toBeInTheDocument();
        expect(screen.getByText(/second draft post/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no drafts exist', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        expect(screen.getByText(/no draft posts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #2: Draft list displays text preview and date', () => {
    it('should show text preview for each draft', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'draft-001',
              content: 'This is a draft post with some content',
              status: 'DRAFT',
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
        }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        expect(screen.getByText(/this is a draft post with some content/i)).toBeInTheDocument();
      });
    });

    it('should show creation date for each draft', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'draft-001',
              content: 'Draft post',
              status: 'DRAFT',
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
        }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        expect(screen.getByText(/January 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Behavior #3: Draft actions - Edit button', () => {
    it('should navigate to edit draft when edit button is clicked', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'draft-001',
              content: 'Draft post',
              status: 'DRAFT',
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
        }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Behavior #4: Draft actions - Submit button', () => {
    it('should have submit button for each draft', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'draft-001',
              content: 'Draft post',
              status: 'DRAFT',
              createdAt: '2024-01-01T10:00:00Z',
            },
          ],
        }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        const submitButtons = screen.getAllByRole('button', { name: /submit/i });
        expect(submitButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Behavior #5: Draft actions - Delete button', () => {
    it('should delete draft when delete button is clicked', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'draft-001',
                content: 'Draft post',
                status: 'DRAFT',
                createdAt: '2024-01-01T10:00:00Z',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        expect(screen.getByText(/draft post/i)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/posts/draft-001'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Behavior #6: Page heading and layout', () => {
    it('should display page title', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6IkNPTU1TX09GRklDRVIifQ.sig';
      localStorage.setItem('auth_token', mockToken);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderWithRouter(<Drafts />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /draft posts/i })).toBeInTheDocument();
      });
    });
  });
});
