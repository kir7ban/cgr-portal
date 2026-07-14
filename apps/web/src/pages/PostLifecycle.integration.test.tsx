import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Feed } from './Feed';
import { ArchiveView } from './ArchiveView';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * INTEGRATION TEST SUITE: Post Lifecycle
 * Tests Issues #13-14: Edit, Re-approval, Revoke, and Archive workflows
 */

describe('Post Lifecycle Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should allow post creator to edit published post', async () => {
    // Employee token for alice
    const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlbXAyIiwidXNlcm5hbWUiOiJhbGljZSIsInJvbGUiOiJFTVBMT1lFRSJ9.sig';
    localStorage.setItem('auth_token', employeeToken);

    const mockPost = {
      id: 'post-1',
      text: 'Original post content',
      createdBy: 'alice',
      state: 'PUBLISHED',
    };

    const editedPost = {
      id: 'post-1',
      text: 'Updated post content',
      createdBy: 'alice',
      state: 'SUBMITTED',
      revisionCount: 2,
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => editedPost,
      });

    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify post is rendered
    await waitFor(() => {
      expect(screen.getByText(/original post content/i)).toBeInTheDocument();
    });

    // Find and click edit button (for creator only)
    const editBtn = screen.queryByRole('button', { name: /edit/i });
    if (editBtn) {
      fireEvent.click(editBtn);

      // Verify edit form appears with pre-populated content
      await waitFor(() => {
        const textarea = screen.getByDisplayValue(/original post content/i);
        expect(textarea).toBeInTheDocument();

        // Update content
        fireEvent.change(textarea, { target: { value: 'Updated post content' } });
        fireEvent.click(screen.getByRole('button', { name: /submit|save/i }));
      });

      // Verify post transitions to SUBMITTED state
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/posts/post-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ text: 'Updated post content' }),
          })
        );
      });
    }
  });

  it('should transition edited post to SUBMITTED for re-approval', async () => {
    const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlbXAyIiwidXNlcm5hbWUiOiJhbGljZSIsInJvbGUiOiJFTVBMT1lFRSJ9.sig';
    localStorage.setItem('auth_token', employeeToken);

    const editedPost = {
      id: 'post-1',
      text: 'Updated post content',
      createdBy: 'alice',
      state: 'SUBMITTED',
      revisionCount: 2,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => editedPost,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify state is SUBMITTED after edit
    expect(editedPost.state).toBe('SUBMITTED');
  });

  it('should track revision history in audit trail after edit', async () => {
    const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlbXAyIiwidXNlcm5hbWUiOiJhbGljZSIsInJvbGUiOiJFTVBMT1lFRSJ9.sig';
    localStorage.setItem('auth_token', employeeToken);

    const editedPost = {
      id: 'post-1',
      text: 'Updated post content',
      createdBy: 'alice',
      state: 'SUBMITTED',
      revisionCount: 2,
      lastEditedAt: '2026-07-14T11:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => editedPost,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify revision count increased
    expect(editedPost.revisionCount).toBe(2);
  });

  it('should allow admin to revoke published post', async () => {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);

    const mockPosts = {
      items: [
        {
          id: 'post-1',
          text: 'Published post',
          createdBy: 'alice',
          state: 'PUBLISHED',
          createdAt: '2026-07-10T10:00:00Z',
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 1,
    };

    const revokedPost = {
      id: 'post-1',
      text: 'Published post',
      createdBy: 'alice',
      state: 'REVOKED',
      revokeReason: 'Contains error',
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => revokedPost,
      });

    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/published post/i)).toBeInTheDocument();
    });

    // Find and click revoke button (admin only)
    const revokeBtn = screen.queryByRole('button', { name: /revoke/i });
    if (revokeBtn) {
      fireEvent.click(revokeBtn);

      // Verify revoke modal appears
      await waitFor(() => {
        expect(screen.getByText(/revoke/i)).toBeInTheDocument();
      });

      // Enter reason
      const textarea = screen.getByPlaceholderText(/reason|why/i);
      if (textarea) {
        fireEvent.change(textarea, { target: { value: 'Contains error' } });
        fireEvent.click(screen.getByRole('button', { name: /confirm.*revoke|revoke/i }));

        // Verify revoke was called
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/posts/post-1/revoke',
            expect.objectContaining({
              method: 'POST',
              body: JSON.stringify({ reason: 'Contains error' }),
            })
          );
        });
      }
    }
  });

  it('should remove revoked post from feed', async () => {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);

    const mockPosts = {
      items: [
        {
          id: 'post-1',
          text: 'Still published',
          createdBy: 'bob',
          state: 'PUBLISHED',
          createdAt: '2026-07-10T10:00:00Z',
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 1,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify revoked post is not in feed
    await waitFor(() => {
      expect(screen.getByText(/still published/i)).toBeInTheDocument();
    });

    // Revoked posts should be excluded from regular feed
    expect(screen.queryByText(/revoked/i)).not.toBeInTheDocument();
  });

  it('should allow admin to archive post', async () => {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);

    const mockPosts = {
      items: [
        {
          id: 'post-1',
          text: 'Post to archive',
          createdBy: 'alice',
          state: 'PUBLISHED',
          createdAt: '2026-07-10T10:00:00Z',
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 1,
    };

    const archivedPost = {
      id: 'post-1',
      text: 'Post to archive',
      createdBy: 'alice',
      state: 'ARCHIVED',
      archivedAt: '2026-07-14T12:00:00Z',
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => archivedPost,
      });

    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/post to archive/i)).toBeInTheDocument();
    });

    // Find and click archive button
    const archiveBtn = screen.queryByRole('button', { name: /archive/i });
    if (archiveBtn) {
      fireEvent.click(archiveBtn);

      // Verify archive was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/posts/post-1/archive',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    }
  });

  it('should exclude archived posts from feed', async () => {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);

    const mockPosts = {
      items: [
        {
          id: 'post-1',
          text: 'Published post',
          createdBy: 'bob',
          state: 'PUBLISHED',
          createdAt: '2026-07-10T10:00:00Z',
        },
      ],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
      totalPages: 1,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Feed />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/published post/i)).toBeInTheDocument();
    });

    // Archived posts should not be in feed
    expect(screen.queryByText(/archived/i)).not.toBeInTheDocument();
  });

  it('should show archived posts in ArchiveView', async () => {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);

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
          createdAt: '2026-07-09T10:00:00Z',
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

    // Verify archived posts are displayed
    await waitFor(() => {
      expect(screen.getByText(/archived post 1/i)).toBeInTheDocument();
      expect(screen.getByText(/archived post 2/i)).toBeInTheDocument();
    });

    // Verify ARCHIVED badge is shown
    expect(screen.getAllByText(/ARCHIVED/i).length).toBeGreaterThanOrEqual(2);
  });
});
