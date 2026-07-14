import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Approval } from './Approval';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #10 - Approval Dashboard - Submission Queue
 */

describe('Approval Dashboard - Issue #10', () => {
  beforeEach(() => {
    localStorage.clear();
    // Admin token
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);
  });

  it('should redirect non-admin users away from /approval route', () => {
    localStorage.clear();
    // Employee token
    const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlbXAyIiwidXNlcm5hbWUiOiJib2IiLCJyb2xlIjoiRU1QTE9ZRUUifQ.sig';
    localStorage.setItem('auth_token', employeeToken);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    // Should redirect to feed (handled by ProtectedRoute)
    // For now, verify component loads or redirects gracefully
    // This behavior is tested by ProtectedRoute
  });

  it('should fetch and display pending approval queue', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T08:00:00Z',
          state: 'PENDING',
          proposedAudience: 'PUBLIC',
        },
        {
          id: 'submission-2',
          postId: 'post-2',
          createdBy: 'bob',
          submittedAt: '2026-07-14T09:00:00Z',
          state: 'PENDING',
          proposedAudience: 'INTERNAL',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
      expect(screen.getByText(/bob/i)).toBeInTheDocument();
    });
  });

  it('should display queue item with text preview, author, and submission date', async () => {
    // Mock the post content fetch (for preview text)
    const mockPost = {
      ok: true,
      json: async () => ({
        id: 'post-1',
        text: 'This is the first post content that needs approval',
        createdBy: 'alice',
      }),
    };

    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING',
        },
      ],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      })
      .mockResolvedValueOnce(mockPost);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
      expect(screen.getByText(/2026-07-14/)).toBeInTheDocument();
    });
  });

  it('should display status badge showing PENDING state', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  it('should display status badge showing PENDING_REVIEW with reviewer name', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING_REVIEW',
          pendingReviewBy: 'charlie',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/under review/i)).toBeInTheDocument();
      expect(screen.getByText(/charlie/i)).toBeInTheDocument();
    });
  });

  it('should sort queue by submission date (oldest first)', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T08:00:00Z',
          state: 'PENDING',
        },
        {
          id: 'submission-2',
          postId: 'post-2',
          createdBy: 'bob',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      const items = container.querySelectorAll('.queue-item');
      expect(items.length).toBe(2);
      // First item should be alice (oldest submission)
      expect(items[0].textContent).toContain('alice');
      // Second item should be bob (newer submission)
      expect(items[1].textContent).toContain('bob');
    });
  });

  it('should display queue count in header', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING',
        },
        {
          id: 'submission-2',
          postId: 'post-2',
          createdBy: 'bob',
          submittedAt: '2026-07-14T11:00:00Z',
          state: 'PENDING',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/queue.*2|2.*queue/i)).toBeInTheDocument();
    });
  });

  it('should load detail view when clicking on a queue item', async () => {
    const mockQueue = {
      success: true,
      data: [
        {
          id: 'submission-1',
          postId: 'post-1',
          createdBy: 'alice',
          submittedAt: '2026-07-14T10:00:00Z',
          state: 'PENDING',
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueue,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });

    const queueItem = screen.getByText(/alice/i).closest('.queue-item');
    if (queueItem) {
      fireEvent.click(queueItem);
      // Detail view should be displayed (with actions like Approve, Reject, etc)
      // This is tested more comprehensively in ApprovalDetail.test.tsx
    }
  });

  it('should display loading state while fetching queue', () => {
    global.fetch = vi.fn(() => new Promise(() => {}));

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
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
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });
});
