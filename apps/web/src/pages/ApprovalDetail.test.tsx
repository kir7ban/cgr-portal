import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ApprovalDetail } from './ApprovalDetail';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * TEST SUITE: Issue #11 - Approval - Reject & Feedback
 * TEST SUITE: Issue #12 - Approval - Pending Review & Override
 */

describe('ApprovalDetail Component - Issue #11 & #12', () => {
  beforeEach(() => {
    localStorage.clear();
    // Admin token
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbjEiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6IkFETUlOIn0.sig';
    localStorage.setItem('auth_token', adminToken);
  });

  it('should display submission details', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });
  });

  // Issue #11 Tests: Reject & Feedback
  it('should display Request Feedback button', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request feedback/i })).toBeInTheDocument();
    });
  });

  it('should open feedback modal when Request Feedback button is clicked', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request feedback/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request feedback/i }));

    await waitFor(() => {
      expect(screen.getByText(/feedback message/i)).toBeInTheDocument();
    });
  });

  it('should send feedback via POST /api/submissions/{id}/feedback', async () => {
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

    const feedbackResponse = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'FEEDBACK',
        feedbackMessage: 'Please fix the title',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => feedbackResponse,
      });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request feedback/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request feedback/i }));

    await waitFor(() => {
      expect(screen.getByText(/feedback message/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/enter feedback/i);
    fireEvent.change(textarea, { target: { value: 'Please fix the title' } });

    const submitBtn = screen.getByRole('button', { name: /submit.*feedback|send/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/submissions/submission-1/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Please fix the title' }),
        })
      );
    });
  });

  it('should display Reject button', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });
  });

  it('should open reject modal when Reject button is clicked', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(screen.getByText(/rejection reason|reason for rejection/i)).toBeInTheDocument();
    });
  });

  it('should send rejection via POST /api/submissions/{id}/reject', async () => {
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

    const rejectResponse = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'REJECTED',
        rejectionReason: 'Not appropriate for this audience',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => rejectResponse,
      });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(screen.getByText(/rejection reason|reason for rejection/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/enter reason|reason for rejection/i);
    fireEvent.change(textarea, { target: { value: 'Not appropriate for this audience' } });

    const submitBtn = screen.getByRole('button', { name: /confirm.*reject|submit.*reject|reject/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/submissions/submission-1/reject',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Not appropriate for this audience' }),
        })
      );
    });
  });

  // Issue #12 Tests: Pending Review & Override
  it('should display Mark for Review button', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark.*review|pending review/i })).toBeInTheDocument();
    });
  });

  it('should mark submission for pending review via POST /api/submissions/{id}/pending-review', async () => {
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

    const reviewResponse = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'PENDING_REVIEW',
        pendingReviewBy: 'admin1',
        pendingReviewAt: '2026-07-14T10:05:00Z',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => reviewResponse,
      });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark.*review|pending review/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark.*review|pending review/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/submissions/submission-1/pending-review',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should display Approve button', async () => {
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

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubmission,
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    });
  });

  it('should show success toast on feedback submit', async () => {
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

    const feedbackResponse = {
      success: true,
      data: {
        ...mockSubmission.data,
        state: 'FEEDBACK',
        feedbackMessage: 'Please fix the title',
      },
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubmission,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => feedbackResponse,
      });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ApprovalDetail submissionId="submission-1" onClose={() => {}} />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request feedback/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /request feedback/i }));

    await waitFor(() => {
      expect(screen.getByText(/feedback message/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/enter feedback/i);
    fireEvent.change(textarea, { target: { value: 'Please fix the title' } });

    const submitBtn = screen.getByRole('button', { name: /submit.*feedback|send/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/feedback sent|success/i)).toBeInTheDocument();
    });
  });
});
