import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostService, PostDocument } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';
import { AuditingService } from '../database/auditing.service';
import { AuthorizationService } from '../auth/authorization.service';
import { POST_STATES } from '../domain/state-types';

export interface Submission {
  id: string;
  postId: string;
  createdBy: string;
  submittedAt: string;
  state: 'PENDING' | 'APPROVED' | POST_STATES.REJECTED | 'FEEDBACK' | 'PENDING_REVIEW';
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

export interface ApprovalDto {
  audience?: string;
}

export interface RejectDto {
  reason: string;
}

export interface FeedbackDto {
  message: string;
}

export interface OverrideDto {
  reason: string;
  audience?: string;
}

@Injectable()
export class ApprovalService {
  private submissions: Map<string, Submission> = new Map();
  private submissionsByPost: Map<string, string[]> = new Map();
  private rejectedPosts: Set<string> = new Set();

  constructor(
    private postService: PostService,
    private databaseService: DatabaseService,
    private auditingService: AuditingService,
    private authorizationService: AuthorizationService,
  ) {}

  /**
   * Approve a submitted post for publication
   * @param submissionId - The submission ID
   * @param adminId - The admin approving the submission
   * @param dto - Approval details (audience override)
   * @returns Updated submission
   */
  async approve(submissionId: string, adminId: string, dto: ApprovalDto): Promise<Submission> {
    this.authorizationService.enforceRole(adminId, 'ADMIN', 'Only Admins can perform approval actions');

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.state === 'APPROVED' || submission.state === POST_STATES.PUBLISHED) {
      throw new BadRequestException('Submission already approved');
    }

    if (submission.state !== 'PENDING' && submission.state !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        'Can only approve submissions in PENDING or PENDING_REVIEW state',
      );
    }

    // Check if post was previously rejected - admin can still approve with override
    const wasRejected = submission.rejectionReason !== undefined;

    submission.state = 'APPROVED';
    submission.reviewedBy = adminId;
    submission.reviewedAt = new Date().toISOString();
    submission.finalAudience = dto.audience || submission.proposedAudience;
    submission.pendingReviewBy = undefined;
    submission.pendingReviewAt = undefined;

    // Publish the post
    const post = await this.postService.updatePostState(submission.postId, POST_STATES.PUBLISHED);

    this.submissions.set(submissionId, submission);

    const auditAction = wasRejected && submission.overriddenBy ? 'approve_with_override' : 'approve_post';
    await this.auditingService.logAction({
      actor: adminId,
      action: auditAction,
      resource: 'submission',
      resourceId: submissionId,
    });

    return submission;
  }

  /**
   * Reject a submitted post (no resubmission allowed)
   * @param submissionId - The submission ID
   * @param adminId - The admin rejecting the submission
   * @param dto - Rejection details (reason)
   * @returns Updated submission
   */
  async reject(submissionId: string, adminId: string, dto: RejectDto): Promise<Submission> {
    this.authorizationService.enforceRole(adminId, 'ADMIN', 'Only Admins can perform approval actions');

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.state === POST_STATES.REJECTED) {
      throw new BadRequestException('Submission already rejected');
    }

    if (submission.state !== 'PENDING' && submission.state !== 'PENDING_REVIEW') {
      throw new BadRequestException('Can only reject submissions in PENDING or PENDING_REVIEW state');
    }

    submission.state = POST_STATES.REJECTED;
    submission.reviewedBy = adminId;
    submission.reviewedAt = new Date().toISOString();
    submission.rejectionReason = dto.reason;
    submission.pendingReviewBy = undefined;
    submission.pendingReviewAt = undefined;

    // Mark post as rejected (cannot be resubmitted)
    await this.postService.updatePostState(submission.postId, POST_STATES.REJECTED);
    this.rejectedPosts.add(submission.postId);

    this.submissions.set(submissionId, submission);

    await this.auditingService.logAction({
      actor: adminId,
      action: 'reject_post',
      resource: 'submission',
      resourceId: submissionId,
    });

    return submission;
  }

  /**
   * Send feedback to request revisions
   * @param submissionId - The submission ID
   * @param adminId - The admin sending feedback
   * @param dto - Feedback details (message)
   * @returns Updated submission
   */
  async sendFeedback(submissionId: string, adminId: string, dto: FeedbackDto): Promise<Submission> {
    this.authorizationService.enforceRole(adminId, 'ADMIN', 'Only Admins can perform approval actions');

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.state === 'FEEDBACK') {
      throw new BadRequestException('Feedback already sent for this submission');
    }

    if (submission.state !== 'PENDING' && submission.state !== 'PENDING_REVIEW') {
      throw new BadRequestException('Can only send feedback for submissions in PENDING or PENDING_REVIEW state');
    }

    submission.state = 'FEEDBACK';
    submission.reviewedBy = adminId;
    submission.reviewedAt = new Date().toISOString();
    submission.feedbackMessage = dto.message;
    submission.pendingReviewBy = undefined;
    submission.pendingReviewAt = undefined;

    // Return post to draft state for revision
    await this.postService.updatePostState(submission.postId, POST_STATES.DRAFT);

    this.submissions.set(submissionId, submission);

    await this.auditingService.logAction({
      actor: adminId,
      action: 'send_feedback',
      resource: 'submission',
      resourceId: submissionId,
    });

    return submission;
  }

  /**
   * Override a rejection decision to approve a post
   * Admin B can override Admin A's rejection decision
   * @param submissionId - The submission ID
   * @param adminId - The admin overriding (Admin B)
   * @param dto - Override details (reason, optional audience)
   * @returns Updated submission
   */
  async override(submissionId: string, adminId: string, dto: OverrideDto): Promise<Submission> {
    this.authorizationService.enforceRole(adminId, 'ADMIN', 'Only Admins can perform approval actions');

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.state !== POST_STATES.REJECTED && submission.state !== 'FEEDBACK') {
      throw new BadRequestException(
        'Can only override submissions in REJECTED or FEEDBACK state',
      );
    }

    if (submission.reviewedBy === adminId) {
      throw new ForbiddenException('Admin who made the original decision cannot override it');
    }

    submission.state = 'APPROVED';
    submission.overriddenBy = adminId;
    submission.overrideReason = dto.reason;
    submission.finalAudience = dto.audience || submission.proposedAudience;
    submission.reviewedBy = adminId;
    submission.reviewedAt = new Date().toISOString();

    // Publish the post
    await this.postService.updatePostState(submission.postId, POST_STATES.PUBLISHED);

    this.submissions.set(submissionId, submission);

    await this.auditingService.logAction({
      actor: adminId,
      action: 'override_decision',
      resource: 'submission',
      resourceId: submissionId,
    });

    return submission;
  }

  /**
   * Mark a submission as pending review for collaborative decision-making
   * Visible to all admins with flag "under review by [Admin name]"
   * @param submissionId - The submission ID
   * @param adminId - The admin marking for review
   * @returns Updated submission
   */
  async markPendingReview(submissionId: string, adminId: string): Promise<Submission> {
    this.authorizationService.enforceRole(adminId, 'ADMIN', 'Only Admins can perform approval actions');

    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (submission.state !== 'PENDING') {
      throw new BadRequestException('Can only mark PENDING submissions for review');
    }

    submission.state = 'PENDING_REVIEW';
    submission.pendingReviewBy = adminId;
    submission.pendingReviewAt = new Date().toISOString();

    this.submissions.set(submissionId, submission);

    await this.auditingService.logAction({
      actor: adminId,
      action: 'mark_pending_review',
      resource: 'submission',
      resourceId: submissionId,
    });

    return submission;
  }

  /**
   * Create a new submission when post is submitted for approval
   * @param postId - The post ID
   * @param createdBy - The user submitting
   * @param proposedAudience - The proposed audience scope
   * @returns New submission
   */
  async createSubmission(
    postId: string,
    createdBy: string,
    proposedAudience?: string,
  ): Promise<Submission> {
    // Check if post was previously rejected
    if (this.rejectedPosts.has(postId)) {
      throw new BadRequestException('Rejected posts cannot be resubmitted');
    }

    const submission: Submission = {
      id: `submission-${postId}-${Date.now()}`,
      postId,
      createdBy,
      submittedAt: new Date().toISOString(),
      state: 'PENDING',
      proposedAudience,
    };

    this.submissions.set(submission.id, submission);

    if (!this.submissionsByPost.has(postId)) {
      this.submissionsByPost.set(postId, []);
    }
    this.submissionsByPost.get(postId)!.push(submission.id);

    return submission;
  }

  /**
   * Get all pending submissions in the approval queue
   * @returns Array of pending submissions
   */
  async getApprovalQueue(): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(
      (sub) => sub.state === 'PENDING' || sub.state === 'PENDING_REVIEW',
    );
  }

  /**
   * Get submission details by ID
   * @param submissionId - The submission ID
   * @returns Submission details
   */
  async getSubmission(submissionId: string): Promise<Submission> {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new BadRequestException('Submission not found');
    }
    return submission;
  }

  /**
   * Get all submissions for a post (history of attempts)
   * @param postId - The post ID
   * @returns Array of submissions for the post
   */
  async getSubmissionsForPost(postId: string): Promise<Submission[]> {
    const submissionIds = this.submissionsByPost.get(postId) || [];
    return submissionIds
      .map((id) => this.submissions.get(id))
      .filter((sub): sub is Submission => sub !== undefined);
  }

  /**
   * Get pending submissions under review
   * @returns Array of submissions marked for pending review
   */
  async getPendingReviewSubmissions(): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter((sub) => sub.state === 'PENDING_REVIEW');
  }
}
