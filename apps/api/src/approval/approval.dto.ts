export class ApprovalRequestDto {
  audience?: string;
}

export class RejectRequestDto {
  reason: string;
}

export class FeedbackRequestDto {
  message: string;
}

export class OverrideRequestDto {
  reason: string;
  audience?: string;
}

export class SubmissionResponseDto {
  id: string;
  postId: string;
  createdBy: string;
  submittedAt: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FEEDBACK' | 'PENDING_REVIEW';
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
