import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useApprovalQueue } from '../hooks/useApprovalQueue';
import { ApprovalDetail } from './ApprovalDetail';

export function Approval() {
  const { currentUser } = useAuthContext();
  const { submissions, isLoading, error, refresh } = useApprovalQueue();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Redirect non-admin users
  if (currentUser && currentUser.role !== 'ADMIN') {
    return <Navigate to="/feed" replace />;
  }

  const getStatusBadge = (submission: ReturnType<typeof useApprovalQueue>['submissions'][0]) => {
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

  const handleDetailClose = async () => {
    setSelectedSubmissionId(null);
    // Refresh queue after detail view closes
    await refresh();
  };

  if (selectedSubmissionId) {
    return (
      <ApprovalDetail
        submissionId={selectedSubmissionId}
        onClose={handleDetailClose}
      />
    );
  }

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
