import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Submission {
  id: string;
  postId: string;
  createdBy: string;
  submittedAt: string;
  state: 'PENDING' | 'PENDING_REVIEW';
  proposedAudience?: string;
  pendingReviewBy?: string;
  pendingReviewAt?: string;
}

interface ApprovalQueueResponse {
  success: boolean;
  data: Submission[];
}

export function Approval() {
  const { currentUser } = useAuthContext();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Redirect non-admin users
  if (currentUser && currentUser.role !== 'ADMIN') {
    return <Navigate to="/feed" replace />;
  }

  useEffect(() => {
    fetchApprovalQueue();
  }, []);

  const fetchApprovalQueue = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/submissions/queue');

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load approval queue');
        return;
      }

      const data: ApprovalQueueResponse = await response.json();

      // Sort by submission date (oldest first)
      const sorted = [...data.data].sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );

      setSubmissions(sorted);
    } catch (err) {
      setError('Failed to load approval queue');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (submission: Submission) => {
    if (submission.state === 'PENDING_REVIEW') {
      return (
        <span className="status-badge pending-review">
          Under review by {submission.pendingReviewBy}
        </span>
      );
    }
    return <span className="status-badge pending">PENDING</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="approval-container">Loading...</div>;
  }

  if (error) {
    return <div className="approval-container error">{error}</div>;
  }

  return (
    <div className="approval-container">
      <div className="approval-header">
        <h1>Approval Dashboard</h1>
        <div className="queue-count">Queue: {submissions.length}</div>
      </div>

      {submissions.length === 0 ? (
        <div className="empty-queue">No submissions to review</div>
      ) : (
        <div className="queue-list">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="queue-item"
              onClick={() => setSelectedSubmissionId(submission.id)}
              role="button"
              tabIndex={0}
            >
              <div className="queue-item-header">
                <div className="submission-info">
                  <span className="author">{submission.createdBy}</span>
                  <span className="timestamp">{formatDate(submission.submittedAt)}</span>
                </div>
                {getStatusBadge(submission)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
