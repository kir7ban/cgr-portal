import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApprovalService, Submission } from './approval.service';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';

describe('ApprovalService (Issues #5-7)', () => {
  let service: ApprovalService;
  let postService: PostService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    postService = new PostService(databaseService);
    service = new ApprovalService(postService, databaseService);
  });

  describe('Issue #5: Approval Actions', () => {
    describe('approve()', () => {
      it('should approve a PENDING submission and publish post', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const result = await service.approve(submission.id, 'admin', { audience: 'org-wide' });

        expect(result.state).toBe('APPROVED');
        expect(result.reviewedBy).toBe('admin');
        expect(result.finalAudience).toBe('org-wide');
        expect(result.reviewedAt).toBeDefined();
      });

      it('should override proposed audience on approval', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'dept-only');
        const result = await service.approve(submission.id, 'admin', { audience: 'org-wide' });

        expect(result.finalAudience).toBe('org-wide');
      });

      it('should use proposed audience if not overridden', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const result = await service.approve(submission.id, 'admin', {});

        expect(result.finalAudience).toBe('org-wide');
      });

      it('should clear pending review flag on approval', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin');

        const approved = await service.approve(submission.id, 'admin', {});
        expect(approved.pendingReviewBy).toBeUndefined();
        expect(approved.pendingReviewAt).toBeUndefined();
      });

      it('should log audit entry on approval', async () => {
        await databaseService.connect();
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.approve(submission.id, 'admin', {});

        const auditEntries = await databaseService.getCollections();
        expect(auditEntries).toContain('audit');
      });

      it('should reject approval of already approved submission', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.approve(submission.id, 'admin', {});

        expect(service.approve(submission.id, 'admin', {})).rejects.toThrow(
          'Submission already approved',
        );
      });

      it('should enforce ADMIN role requirement', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

        expect(service.approve(submission.id, 'alice.smith', {})).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should only approve from PENDING or PENDING_REVIEW state', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate content' });

        expect(service.approve(submission.id, 'admin', {})).rejects.toThrow(
          'Can only approve submissions in PENDING or PENDING_REVIEW state',
        );
      });
    });

    describe('reject()', () => {
      it('should reject a PENDING submission with reason', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const result = await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        expect(result.state).toBe('REJECTED');
        expect(result.rejectionReason).toBe('Inappropriate');
        expect(result.reviewedBy).toBe('admin');
      });

      it('should mark post as rejected preventing resubmission', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Rejected' });

        expect(
          service.createSubmission('post-1', 'alice.smith', 'org-wide'),
        ).rejects.toThrow('Rejected posts cannot be resubmitted');
      });

      it('should clear pending review flag on rejection', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin');

        const rejected = await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });
        expect(rejected.pendingReviewBy).toBeUndefined();
        expect(rejected.pendingReviewAt).toBeUndefined();
      });

      it('should log audit entry on rejection', async () => {
        await databaseService.connect();
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        const auditEntries = await databaseService.getCollections();
        expect(auditEntries).toContain('audit');
      });

      it('should reject rejection of already rejected submission', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        expect(service.reject(submission.id, 'admin', { reason: 'Already rejected' })).rejects.toThrow(
          'Submission already rejected',
        );
      });

      it('should enforce ADMIN role requirement', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

        expect(service.reject(submission.id, 'alice.smith', { reason: 'Inappropriate' })).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should only reject from PENDING or PENDING_REVIEW state', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.approve(submission.id, 'admin', {});

        expect(service.reject(submission.id, 'admin', { reason: 'Late rejection' })).rejects.toThrow(
          'Can only reject submissions in PENDING or PENDING_REVIEW state',
        );
      });
    });

    describe('sendFeedback()', () => {
      it('should send feedback and return post to DRAFT state', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const result = await service.sendFeedback(submission.id, 'admin', {
          message: 'Please revise the content',
        });

        expect(result.state).toBe('FEEDBACK');
        expect(result.feedbackMessage).toBe('Please revise the content');
        expect(result.reviewedBy).toBe('admin');
      });

      it('should clear pending review flag on feedback', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin');

        const feedback = await service.sendFeedback(submission.id, 'admin', {
          message: 'Needs revision',
        });
        expect(feedback.pendingReviewBy).toBeUndefined();
        expect(feedback.pendingReviewAt).toBeUndefined();
      });

      it('should log audit entry on feedback', async () => {
        await databaseService.connect();
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(submission.id, 'admin', { message: 'Needs revision' });

        const auditEntries = await databaseService.getCollections();
        expect(auditEntries).toContain('audit');
      });

      it('should reject feedback on already feedback submission', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(submission.id, 'admin', { message: 'First feedback' });

        expect(service.sendFeedback(submission.id, 'admin', { message: 'Second feedback' })).rejects.toThrow(
          'Feedback already sent for this submission',
        );
      });

      it('should enforce ADMIN role requirement', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

        expect(
          service.sendFeedback(submission.id, 'alice.smith', { message: 'Feedback' }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should only send feedback from PENDING or PENDING_REVIEW state', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        expect(
          service.sendFeedback(submission.id, 'admin', { message: 'Feedback' }),
        ).rejects.toThrow('Can only send feedback for submissions in PENDING or PENDING_REVIEW state');
      });

      it('should enable Comms Officer to revise and resubmit', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(submission.id, 'admin', { message: 'Add more detail' });

        // Comms Officer revises post and creates new submission
        const revised = await service.createSubmission('post-1-revised', 'alice.smith', 'org-wide');
        expect(revised.state).toBe('PENDING');
      });
    });
  });

  describe('Issue #6: Override Authority', () => {
    describe('override()', () => {
      it('should override a REJECTED submission', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        const overridden = await service.override(submission.id, 'admin-b', {
          reason: 'Business continuity required',
        });

        expect(overridden.state).toBe('APPROVED');
        expect(overridden.overriddenBy).toBe('admin-b');
        expect(overridden.overrideReason).toBe('Business continuity required');
      });

      it('should override a FEEDBACK submission', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(submission.id, 'admin', { message: 'Revise please' });

        const overridden = await service.override(submission.id, 'admin-b', {
          reason: 'Approved anyway',
        });

        expect(overridden.state).toBe('APPROVED');
        expect(overridden.overriddenBy).toBe('admin-b');
      });

      it('should prevent original decision maker from overriding own decision', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        expect(
          service.override(submission.id, 'admin', { reason: 'Override my own rejection' }),
        ).rejects.toThrow('Admin who made the original decision cannot override it');
      });

      it('should override audience on override', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'dept-only');
        await service.reject(submission.id, 'admin', { reason: 'Wrong audience' });

        const overridden = await service.override(submission.id, 'admin-b', {
          reason: 'Actually approved org-wide',
          audience: 'org-wide',
        });

        expect(overridden.finalAudience).toBe('org-wide');
      });

      it('should use proposed audience if not overridden in override', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        const overridden = await service.override(submission.id, 'admin-b', {
          reason: 'Approved',
        });

        expect(overridden.finalAudience).toBe('org-wide');
      });

      it('should log override in audit trail', async () => {
        await databaseService.connect();
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });
        await service.override(submission.id, 'admin-b', { reason: 'Override' });

        const auditEntries = await databaseService.getCollections();
        expect(auditEntries).toContain('audit');
      });

      it('should enforce ADMIN role requirement', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

        expect(service.override(submission.id, 'alice.smith', { reason: 'Override' })).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should only override from REJECTED or FEEDBACK state', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.approve(submission.id, 'admin', {});

        expect(service.override(submission.id, 'admin-b', { reason: 'Override' })).rejects.toThrow(
          'Can only override submissions in REJECTED or FEEDBACK state',
        );
      });

      it('should handle business continuity scenario', async () => {
        // Admin A rejects
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(submission.id, 'admin-a', { reason: 'Inappropriate' });

        // Admin B disagrees and overrides
        const overridden = await service.override(submission.id, 'admin-b', {
          reason: 'Business continuity - Admin A unavailable',
        });

        expect(overridden.state).toBe('APPROVED');
      });
    });
  });

  describe('Issue #7: Pending Review', () => {
    describe('markPendingReview()', () => {
      it('should mark PENDING submission for review', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const result = await service.markPendingReview(submission.id, 'admin');

        expect(result.state).toBe('PENDING_REVIEW');
        expect(result.pendingReviewBy).toBe('admin');
        expect(result.pendingReviewAt).toBeDefined();
      });

      it('should show under review to all admins', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin-a');

        const retrieved = await service.getSubmission(submission.id);
        expect(retrieved.pendingReviewBy).toBe('admin-a');
      });

      it('should log pending review in audit trail', async () => {
        await databaseService.connect();
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin');

        const auditEntries = await databaseService.getCollections();
        expect(auditEntries).toContain('audit');
      });

      it('should enforce ADMIN role requirement', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

        expect(service.markPendingReview(submission.id, 'alice.smith')).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should only mark PENDING submissions for review', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.approve(submission.id, 'admin', {});

        expect(service.markPendingReview(submission.id, 'admin-b')).rejects.toThrow(
          'Can only mark PENDING submissions for review',
        );
      });

      it('should allow other admin to approve after pending review', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin-a');

        // Other admin approves
        const approved = await service.approve(submission.id, 'admin-b', {});
        expect(approved.state).toBe('APPROVED');
        expect(approved.reviewedBy).toBe('admin-b');
      });

      it('should allow other admin to reject after pending review', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin-a');

        // Other admin rejects
        const rejected = await service.reject(submission.id, 'admin-b', { reason: 'Inappropriate' });
        expect(rejected.state).toBe('REJECTED');
        expect(rejected.reviewedBy).toBe('admin-b');
      });

      it('should allow other admin to send feedback after pending review', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin-a');

        // Other admin sends feedback
        const feedback = await service.sendFeedback(submission.id, 'admin-b', {
          message: 'Revise please',
        });
        expect(feedback.state).toBe('FEEDBACK');
      });

      it('should enable collaborative decision making', async () => {
        // Admin A marks for review
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(submission.id, 'admin-a');

        // Admin B checks pending review queue
        const pending = await service.getPendingReviewSubmissions();
        expect(pending).toContainEqual(
          expect.objectContaining({
            id: submission.id,
            state: 'PENDING_REVIEW',
            pendingReviewBy: 'admin-a',
          }),
        );

        // Admin B makes decision
        await service.approve(submission.id, 'admin-b', {});
      });
    });

    describe('getApprovalQueue()', () => {
      it('should include only PENDING submissions', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const sub2 = await service.createSubmission('post-2', 'alice.smith', 'org-wide');

        const queue = await service.getApprovalQueue();
        expect(queue).toContainEqual(expect.objectContaining({ id: sub1.id }));
        expect(queue).toContainEqual(expect.objectContaining({ id: sub2.id }));
      });

      it('should include PENDING_REVIEW submissions', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.markPendingReview(sub1.id, 'admin');

        const queue = await service.getApprovalQueue();
        expect(queue).toContainEqual(
          expect.objectContaining({ id: sub1.id, state: 'PENDING_REVIEW' }),
        );
      });

      it('should exclude APPROVED submissions', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.approve(sub1.id, 'admin', {});

        const queue = await service.getApprovalQueue();
        expect(queue).not.toContainEqual(expect.objectContaining({ id: sub1.id }));
      });

      it('should exclude REJECTED submissions', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.reject(sub1.id, 'admin', { reason: 'Inappropriate' });

        const queue = await service.getApprovalQueue();
        expect(queue).not.toContainEqual(expect.objectContaining({ id: sub1.id }));
      });

      it('should exclude FEEDBACK submissions', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(sub1.id, 'admin', { message: 'Revise' });

        const queue = await service.getApprovalQueue();
        expect(queue).not.toContainEqual(expect.objectContaining({ id: sub1.id }));
      });
    });

    describe('getSubmissionsForPost()', () => {
      it('should return all submissions for a post (history)', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(sub1.id, 'admin', { message: 'Revise' });

        // Second submission after feedback
        const sub2 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

        const history = await service.getSubmissionsForPost('post-1');
        expect(history).toHaveLength(2);
        expect(history).toContainEqual(expect.objectContaining({ id: sub1.id }));
        expect(history).toContainEqual(expect.objectContaining({ id: sub2.id }));
      });

      it('should maintain submission order', async () => {
        const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        await service.sendFeedback(sub1.id, 'admin', { message: 'Revise' });

        const sub2 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

        const history = await service.getSubmissionsForPost('post-1');
        expect(history[0].id).toBe(sub1.id);
        expect(history[1].id).toBe(sub2.id);
      });
    });

    describe('getSubmission()', () => {
      it('should retrieve submission by ID', async () => {
        const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
        const retrieved = await service.getSubmission(submission.id);

        expect(retrieved.id).toBe(submission.id);
        expect(retrieved.postId).toBe('post-1');
        expect(retrieved.createdBy).toBe('alice.smith');
      });

      it('should throw error if submission not found', async () => {
        expect(service.getSubmission('nonexistent')).rejects.toThrow('Submission not found');
      });
    });
  });

  describe('Comprehensive Workflow Tests', () => {
    it('should handle: submit -> pending-review -> approve', async () => {
      const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      expect(submission.state).toBe('PENDING');

      await service.markPendingReview(submission.id, 'admin-a');
      let updated = await service.getSubmission(submission.id);
      expect(updated.state).toBe('PENDING_REVIEW');

      updated = await service.approve(submission.id, 'admin-b', {});
      expect(updated.state).toBe('APPROVED');
    });

    it('should handle: submit -> feedback -> revise -> approve', async () => {
      let submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      await service.sendFeedback(submission.id, 'admin', { message: 'Add more detail' });

      // Comms officer revises and resubmits
      const revised = await service.createSubmission('post-1-v2', 'alice.smith', 'org-wide');
      const approved = await service.approve(revised.id, 'admin', {});

      expect(approved.state).toBe('APPROVED');
    });

    it('should handle: submit -> reject -> override (business continuity)', async () => {
      const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      await service.reject(submission.id, 'admin-a', { reason: 'Inappropriate' });

      const overridden = await service.override(submission.id, 'admin-b', {
        reason: 'Business continuity - admin-a unavailable',
      });

      expect(overridden.state).toBe('APPROVED');
      expect(overridden.overriddenBy).toBe('admin-b');
    });

    it('should prevent rejected post resubmission', async () => {
      const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      await service.reject(submission.id, 'admin', { reason: 'Inappropriate' });

      expect(
        service.createSubmission('post-1', 'alice.smith', 'org-wide'),
      ).rejects.toThrow('Rejected posts cannot be resubmitted');
    });

    it('should maintain full audit trail', async () => {
      await databaseService.connect();
      const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');

      await service.markPendingReview(submission.id, 'admin-a');
      await service.sendFeedback(submission.id, 'admin-b', { message: 'Revise' });

      const revised = await service.createSubmission('post-1-v2', 'alice.smith', 'org-wide');
      await service.approve(revised.id, 'admin-c', {});

      const auditEntries = await databaseService.getCollections();
      expect(auditEntries).toContain('audit');
    });
  });

  describe('Edge Cases & Validation', () => {
    it('should handle concurrent submissions for same post', async () => {
      const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      const sub2 = await service.createSubmission('post-1', 'alice.smith', 'dept-only');

      expect(sub1.id).not.toBe(sub2.id);
      expect(sub1.postId).toBe(sub2.postId);
    });

    it('should handle multiple rejection reasons', async () => {
      const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      const rejected = await service.reject(submission.id, 'admin', {
        reason: 'Violates company policy; contains misinformation',
      });

      expect(rejected.rejectionReason).toBe('Violates company policy; contains misinformation');
    });

    it('should track review history through submissions', async () => {
      const sub1 = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      await service.sendFeedback(sub1.id, 'admin-a', { message: 'Revise' });

      const sub2 = await service.createSubmission('post-1-v2', 'alice.smith', 'org-wide');
      const history = await service.getSubmissionsForPost('post-1');

      expect(history[0].reviewedBy).toBe('admin-a');
      expect(history[0].feedbackMessage).toBe('Revise');
    });

    it('should preserve timestamps throughout workflow', async () => {
      const submission = await service.createSubmission('post-1', 'alice.smith', 'org-wide');
      const before = new Date().toISOString();

      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.approve(submission.id, 'admin', {});

      const approved = await service.getSubmission(submission.id);
      expect(approved.submittedAt).toBeLessThanOrEqual(before);
      expect(approved.reviewedAt).toBeGreaterThan(before);
    });
  });
});
