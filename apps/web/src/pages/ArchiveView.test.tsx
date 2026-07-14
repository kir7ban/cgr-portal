import { render, screen, waitFor } from '@testing-library/react';
import { ArchiveView } from './ArchiveView';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #14 - Post Lifecycle - Revoke & Archive
 */

describe('ArchiveView Component - Issue #14', () => {
  beforeEach(() => {
    localStorage.clear();
    // Admin token
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);
  });

  it('should fetch and display archived posts', async () => {
    const mockArchivedPosts = {
      items: [
        {
          id: 'post-1',
          text: 'Archived post 1',
          createdBy: 'alice',
          state: 'ARCHIVED',
          createdAt: '2026-07-10T10:00:00Z',
        },
        {
          id: 'post-2',
          text: 'Archived post 2',
          createdBy: 'bob',
          state: 'ARCHIVED',
          createdAt: '2026-07-11T10:00:00Z',
        },
      ],
      totalCount: 2,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockArchivedPosts,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ArchiveView />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/archived post 1/i)).toBeInTheDocument();
      expect(screen.getByText(/archived post 2/i)).toBeInTheDocument();
    });
  });

  it('should display "No archived posts" when archive is empty', async () => {
    const mockEmpty = {
      items: [],
      totalCount: 0,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmpty,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ArchiveView />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no archived posts/i)).toBeInTheDocument();
    });
  });

  it('should display loading state while fetching', () => {
    global.fetch = vi.fn(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <AuthProvider>
          <ArchiveView />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display error message on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Server error' } }),
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ArchiveView />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('should exclude revoked posts and show only archived posts', async () => {
    const mockArchivedPosts = {
      items: [
        {
          id: 'post-1',
          text: 'Archived post',
          createdBy: 'alice',
          state: 'ARCHIVED',
          createdAt: '2026-07-10T10:00:00Z',
        },
      ],
      totalCount: 1,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockArchivedPosts,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ArchiveView />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/archived post/i)).toBeInTheDocument();
    });

    // Verify that API call includes state filter
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('ARCHIVED'));
  });
});
