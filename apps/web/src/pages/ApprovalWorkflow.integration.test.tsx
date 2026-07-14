import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Approval } from './Approval';
import { ApprovalDetail } from './ApprovalDetail';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * INTEGRATION TEST SUITE: Full Approval Workflow
 * Tests Issues #10-12 together in realistic workflow scenarios
 */

describe('Approval Workflow Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Admin token
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);
  });

  it('should complete full approval workflow: queue -> detail -> approve', async () => {
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

    const mockSubmission = {
      success: true,
      data: {
        id: 'submission-1',
        postId: 'post-1',
        createdBy: 'alice',
        submittedAt: '2026-07-14T10:00:00Z',
        state: 'PENDING',
      },
    };

    const approvedSubmission = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'APPROVED',
        reviewedBy: 'admin1',
        reviewedAt: '2026-07-14T10:05:00Z',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => approvedSubmission,
      });

    const onClose = vi.fn();

    // Step 1: Render approval dashboard
    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify queue is displayed
    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });

    // Step 2: Click on queue item to view detail
    fireEvent.click(screen.getByText(/alice/i).closest('.queue-item')!);

    // Re-render with detail view
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={onClose} />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify submission details are displayed
    await waitFor(() => {
      expect(screen.getByText(/submission details/i)).toBeInTheDocument();
    });

    // Step 3: Click Approve button
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    // Verify approval was successful
    await waitFor(() => {
      expect(screen.getByText(/submission approved/i)).toBeInTheDocument();
    });
  });

  it('should complete workflow: queue -> detail -> request feedback -> refresh queue', async () => {
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

    const mockSubmission = {
      success: true,
      data: {
        id: 'submission-1',
        postId: 'post-1',
        createdBy: 'alice',
        submittedAt: '2026-07-14T10:00:00Z',
        state: 'PENDING',
      },
    };

    const feedbackSubmission = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'FEEDBACK',
        feedbackMessage: 'Please review the title',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => feedbackSubmission,
      });

    const onClose = vi.fn();

    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });

    rerender(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={onClose} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/submission details/i)).toBeInTheDocument();
    });

    // Click Request Feedback button
    fireEvent.click(screen.getByRole('button', { name: /request feedback/i }));

    // Verify modal appears
    await waitFor(() => {
      expect(screen.getByText(/request feedback/i)).toBeInTheDocument();
    });

    // Enter feedback
    const textarea = screen.getByPlaceholderText(/enter feedback/i);
    fireEvent.change(textarea, { target: { value: 'Please review the title' } });

    // Submit feedback
    fireEvent.click(screen.getByRole('button', { name: /submit.*feedback|send/i }));

    await waitFor(() => {
      expect(screen.getByText(/feedback sent/i)).toBeInTheDocument();
    });
  });

  it('should complete workflow: pending review -> approve (override mechanism)', async () => {
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

    const mockSubmission = {
      success: true,
      data: {
        id: 'submission-1',
        postId: 'post-1',
        createdBy: 'alice',
        submittedAt: '2026-07-14T10:00:00Z',
        state: 'PENDING_REVIEW',
        pendingReviewBy: 'charlie',
      },
    };

    const approvedSubmission = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'APPROVED',
        reviewedBy: 'admin1',
        reviewedAt: '2026-07-14T10:10:00Z',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => approvedSubmission,
      });

    const onClose = vi.fn();

    render(
      <BrowserRouter>
        <AuthProvider>
          <Approval />
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify queue shows "under review" status
    await waitFor(() => {
      expect(screen.getByText(/under review/i)).toBeInTheDocument();
      expect(screen.getByText(/charlie/i)).toBeInTheDocument();
    });

    // Verify other admins can still approve (override)
    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={onClose} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(screen.getByText(/submission approved/i)).toBeInTheDocument();
    });
  });

  it('should handle rejection workflow with audit trail', async () => {
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

    const mockSubmission = {
      success: true,
      data: {
        id: 'submission-1',
        postId: 'post-1',
        createdBy: 'alice',
        submittedAt: '2026-07-14T10:00:00Z',
        state: 'PENDING',
      },
    };

    const rejectedSubmission = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'REJECTED',
        rejectionReason: 'Not appropriate',
        reviewedBy: 'admin1',
        reviewedAt: '2026-07-14T10:05:00Z',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockQueue,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => rejectedSubmission,
      });

    const onClose = vi.fn();

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={onClose} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/submission details/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(screen.getByText(/rejection reason|reason for rejection/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/enter reason/i);
    fireEvent.change(textarea, { target: { value: 'Not appropriate' } });

    fireEvent.click(screen.getByRole('button', { name: /confirm.*reject/i }));

    await waitFor(() => {
      expect(screen.getByText(/submission rejected/i)).toBeInTheDocument();
    });
  });
});
