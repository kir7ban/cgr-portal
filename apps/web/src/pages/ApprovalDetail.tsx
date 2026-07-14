import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { Submission } from '../hooks/useApprovalQueue';

interface ApprovalDetailProps {
  submissionId: string;
  onClose: () => void;
}

type ModalType = 'feedback' | 'reject' | 'approve' | null;

export function ApprovalDetail({ submissionId, onClose }: ApprovalDetailProps) {
  const { currentUser } = useAuthContext();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalText, setModalText] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/submissions/${submissionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load submission');
        return;
      }

      const data = await response.json();
      setSubmission(data.data);
    } catch (err) {
      setError('Failed to load submission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!modalText.trim()) {
      setError('Feedback message cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/submissions/${submissionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: modalText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to send feedback');
        return;
      }

      const data = await response.json();
      setSubmission(data.data);
      setActiveModal(null);
      setModalText('');
      setToast('Feedback sent successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError('Failed to send feedback');
    }
  };

  const handleRejectSubmit = async () => {
    if (!modalText.trim()) {
      setError('Rejection reason cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: modalText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to reject submission');
        return;
      }

      const data = await response.json();
      setSubmission(data.data);
      setActiveModal(null);
      setModalText('');
      setToast('Submission rejected');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError('Failed to reject submission');
    }
  };

  const handleMarkForReview = async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/pending-review`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to mark for review');
        return;
      }

      const data = await response.json();
      setSubmission(data.data);
      setToast('Marked for review');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError('Failed to mark for review');
    }
  };

  const handleApprove = async () => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: submission?.proposedAudience }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to approve submission');
        return;
      }

      const data = await response.json();
      setSubmission(data.data);
      setToast('Submission approved');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setError('Failed to approve submission');
    }
  };

  if (isLoading) {
    return <div className="approval-detail">Loading...</div>;
  }

  if (error) {
    return <div className="approval-detail error">{error}</div>;
  }

  if (!submission) {
    return <div className="approval-detail">Submission not found</div>;
  }

  const canActOnSubmission = submission.state === 'PENDING' || submission.state === 'PENDING_REVIEW';

  return (
    <div className="approval-detail">
      <div className="detail-header">
        <h2>Submission Details</h2>
        <button onClick={onClose} className="close-btn">Close</button>
      </div>

      <div className="detail-content">
        <div className="submission-info">
          <div className="info-row">
            <span className="label">Author:</span>
            <span className="value">{submission.createdBy}</span>
          </div>
          <div className="info-row">
            <span className="label">Submitted:</span>
            <span className="value">{new Date(submission.submittedAt).toLocaleString()}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className="value">
              {submission.state === 'PENDING_REVIEW' && submission.pendingReviewBy ? (
                <>Under review by {submission.pendingReviewBy}</>
              ) : (
                submission.state
              )}
            </span>
          </div>
        </div>

        {toast && <div className="toast success">{toast}</div>}

        {canActOnSubmission && currentUser?.role === 'ADMIN' && (
          <div className="action-buttons">
            <button
              onClick={() => setActiveModal('feedback')}
              className="btn-request-feedback"
            >
              Request Feedback
            </button>
            <button
              onClick={() => setActiveModal('reject')}
              className="btn-reject"
            >
              Reject
            </button>
            <button
              onClick={handleMarkForReview}
              className="btn-pending-review"
            >
              Mark for Review
            </button>
            <button
              onClick={handleApprove}
              className="btn-approve"
            >
              Approve
            </button>
          </div>
        )}
      </div>

      {activeModal === 'feedback' && (
        <div className="modal">
          <div className="modal-content">
            <h3>Request Feedback</h3>
            <textarea
              placeholder="Enter feedback message"
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-buttons">
              <button onClick={handleFeedbackSubmit} className="btn-submit">
                Submit Feedback
              </button>
              <button onClick={() => { setActiveModal(null); setModalText(''); }} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'reject' && (
        <div className="modal">
          <div className="modal-content">
            <h3>Rejection Reason</h3>
            <textarea
              placeholder="Enter reason for rejection"
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-buttons">
              <button onClick={handleRejectSubmit} className="btn-submit">
                Confirm Reject
              </button>
              <button onClick={() => { setActiveModal(null); setModalText(''); }} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
