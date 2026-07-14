import { useState, useCallback, useEffect } from 'react';

export interface Submission {
  id: string;
  postId: string;
  createdBy: string;
  submittedAt: string;
  state: 'PENDING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'FEEDBACK';
  proposedAudience?: string;
  finalAudience?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  feedbackMessage?: string;
  pendingReviewBy?: string;
  pendingReviewAt?: string;
  overriddenBy?: string;
  overrideReason?: string;
}

export interface UseApprovalQueueReturn {
  submissions: Submission[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApprovalQueue(): UseApprovalQueueReturn {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/submissions/queue');

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to load approval queue');
        return;
      }

      const data = await response.json();

      // Sort by submission date (oldest first)
      const sorted = [...data.data].sort(
        (a: Submission, b: Submission) =>
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
      );

      setSubmissions(sorted);
    } catch (err) {
      setError('Failed to load approval queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return {
    submissions,
    isLoading,
    error,
    refresh,
  };
}
