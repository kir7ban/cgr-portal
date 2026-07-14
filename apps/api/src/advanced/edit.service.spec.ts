import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EditService, EditPublishedPostDto, RevisionHistory } from './edit.service';
import { ApprovalService } from '../approval/approval.service';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';

describe('EditService (Issue #14)', () => {
  let service: EditService;
  let postService: PostService;
  let approvalService: ApprovalService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    postService = new PostService(databaseService);
    approvalService = new ApprovalService(postService, databaseService);
    service = new EditService(postService, databaseService, approvalService);
  });

  describe('editPublishedPost()', () => {
    let publishedPost: any;
    let submission: any;

    beforeEach(async () => {
      // Setup: create and publish a post
      publishedPost = await postService.createDraft({
        title: 'Original Title',
        content: 'Original content here',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(publishedPost.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      submission = await approvalService.createSubmission(
        publishedPost.id,
        'alice.smith',
        'org-wide',
      );

      await approvalService.approve(submission.id, 'admin', {});
    });

    it('should edit a published post and change state to SUBMITTED', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        title: 'Updated Title',
        content: 'Updated content here',
      });

      expect(result.post.title).toBe('Updated Title');
      expect(result.post.content).toBe('Updated content here');
      expect(result.post.state).toBe('SUBMITTED');
    });

    it('should create a new submission for re-approval', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated content',
      });

      expect(result.submission).toBeDefined();
      expect(result.submission.state).toBe('PENDING');
      expect(result.submission.postId).toBe(publishedPost.id);
      expect(result.submission.createdBy).toBe('alice.smith');
    });

    it('should preserve proposed audience from original submission', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated content',
      });

      expect(result.submission.proposedAudience).toBe('org-wide');
    });

    it('should create revision history entry', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        title: 'New Title',
        content: 'New content',
      });

      const history = await service.getRevisionHistory(publishedPost.id);
      expect(history).toHaveLength(1);

      const revision = history[0];
      expect(revision.previousTitle).toBe('Original Title');
      expect(revision.previousContent).toBe('Original content here');
      expect(revision.newTitle).toBe('New Title');
      expect(revision.newContent).toBe('New content');
    });

    it('should track revision number', async () => {
      // First edit
      await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'First revision',
      });

      // Approve and publish for next edit
      const submissions1 = await approvalService.getSubmissionsForPost(publishedPost.id);
      await approvalService.approve(submissions1[1].id, 'admin', {});

      // Second edit
      await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Second revision',
      });

      const history = await service.getRevisionHistory(publishedPost.id);
      expect(history[0].revisionNumber).toBe(1);
      expect(history[1].revisionNumber).toBe(2);
    });

    it('should generate automatic changes summary', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        title: 'New Title',
        content: 'New content',
      });

      expect(result.revision.changesSummary).toContain('Title updated');
      expect(result.revision.changesSummary).toContain('Content revised');
    });

    it('should accept custom changes summary', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated',
        changesSummary: 'Fixed typo in opening paragraph',
      });

      expect(result.revision.changesSummary).toBe('Fixed typo in opening paragraph');
    });

    it('should update images on edit', async () => {
      const newImages = [
        { url: 'https://example.com/img2.jpg', size: 2000000, type: 'image/jpeg' },
      ];

      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        images: newImages,
      });

      expect(result.post.images).toEqual(newImages);
      expect(result.revision.changesSummary).toContain('Images updated');
    });

    it('should update video on edit', async () => {
      const newVideo = { url: 'https://youtube.com/watch?v=xyz', source: 'youtube' as const };

      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        video: newVideo,
      });

      expect(result.post.video).toEqual(newVideo);
      expect(result.revision.changesSummary).toContain('Video updated');
    });

    it('should update documents on edit', async () => {
      const newDocs = [
        { url: 'https://example.com/doc.pdf', name: 'document.pdf', size: 5000000, type: 'application/pdf' },
      ];

      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        documents: newDocs,
      });

      expect(result.post.documents).toEqual(newDocs);
      expect(result.revision.changesSummary).toContain('Documents updated');
    });

    it('should log audit entry for edit action', async () => {
      await databaseService.connect();
      await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated',
      });

      const collections = await databaseService.getCollections();
      expect(collections).toContain('audit');
    });

    it('should log revision creation in audit trail', async () => {
      await databaseService.connect();
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated',
      });

      const collections = await databaseService.getCollections();
      expect(collections).toContain('audit');
    });

    it('should prevent non-creator from editing', async () => {
      expect(
        service.editPublishedPost(publishedPost.id, 'bob.jones', {
          content: 'Hacked content',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent editing non-existent post', async () => {
      expect(
        service.editPublishedPost('non-existent', 'alice.smith', {
          content: 'Content',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent editing draft posts', async () => {
      const draft = await postService.createDraft({
        title: 'Draft post',
        content: 'Draft content',
        createdBy: 'alice.smith',
      });

      expect(
        service.editPublishedPost(draft.id, 'alice.smith', {
          content: 'Updated',
        }),
      ).rejects.toThrow('Only published posts can be edited');
    });

    it('should prevent editing rejected posts', async () => {
      const post = await postService.createDraft({
        title: 'Post to reject',
        content: 'Content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.reject(sub.id, 'admin', { reason: 'Inappropriate' });

      expect(
        service.editPublishedPost(post.id, 'alice.smith', {
          content: 'Updated',
        }),
      ).rejects.toThrow('Post not found or you do not have access');
    });

    it('should validate empty content on edit', async () => {
      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          content: '',
        }),
      ).rejects.toThrow('Content cannot be empty');
    });

    it('should validate empty title on edit', async () => {
      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          title: '',
        }),
      ).rejects.toThrow('Title cannot be empty');
    });

    it('should validate image types on edit', async () => {
      const badImages = [
        { url: 'https://example.com/img.exe', size: 1000000, type: 'application/exe' },
      ];

      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          images: badImages,
        }),
      ).rejects.toThrow('Invalid image type');
    });

    it('should validate image size on edit', async () => {
      const largeImage = [
        { url: 'https://example.com/img.jpg', size: 10 * 1024 * 1024, type: 'image/jpeg' },
      ];

      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          images: largeImage,
        }),
      ).rejects.toThrow('Image size cannot exceed 5MB');
    });

    it('should validate max images per post on edit', async () => {
      const tooManyImages = [
        { url: 'https://example.com/img1.jpg', size: 1000000, type: 'image/jpeg' },
        { url: 'https://example.com/img2.jpg', size: 1000000, type: 'image/jpeg' },
        { url: 'https://example.com/img3.jpg', size: 1000000, type: 'image/jpeg' },
        { url: 'https://example.com/img4.jpg', size: 1000000, type: 'image/jpeg' },
      ];

      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          images: tooManyImages,
        }),
      ).rejects.toThrow('Maximum 3 images allowed per post');
    });

    it('should validate video source on edit', async () => {
      const badVideo = { url: 'https://example.com/video.mp4', source: 'direct' as any };

      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          video: badVideo,
        }),
      ).rejects.toThrow('Direct video uploads not allowed');
    });

    it('should validate document types on edit', async () => {
      const badDocs = [
        { url: 'https://example.com/file.exe', name: 'malware.exe', size: 1000000, type: 'application/exe' },
      ];

      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          documents: badDocs,
        }),
      ).rejects.toThrow('Unsupported document type');
    });

    it('should validate document size on edit', async () => {
      const largeDoc = [
        {
          url: 'https://example.com/file.pdf',
          name: 'large.pdf',
          size: 20 * 1024 * 1024,
          type: 'application/pdf',
        },
      ];

      expect(
        service.editPublishedPost(publishedPost.id, 'alice.smith', {
          documents: largeDoc,
        }),
      ).rejects.toThrow('Document size cannot exceed 10MB');
    });

    it('should preserve timestamps in revision history', async () => {
      const before = new Date().toISOString();

      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated',
      });

      expect(result.revision.editedAt).toBeGreaterThanOrEqual(before);
    });

    it('should link submission to revision', async () => {
      const result = await service.editPublishedPost(publishedPost.id, 'alice.smith', {
        content: 'Updated',
      });

      expect(result.revision.submissionId).toBe(result.submission.id);
    });
  });

  describe('getRevisionHistory()', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await postService.createDraft({
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      postId = post.id;
    });

    it('should return empty array for post with no revisions', async () => {
      const history = await service.getRevisionHistory(postId);
      expect(history).toEqual([]);
    });

    it('should return all revisions in chronological order', async () => {
      // First edit
      await service.editPublishedPost(postId, 'alice.smith', {
        content: 'Revision 1',
      });

      const submissions1 = await approvalService.getSubmissionsForPost(postId);
      await approvalService.approve(submissions1[1].id, 'admin', {});

      // Second edit
      await service.editPublishedPost(postId, 'alice.smith', {
        content: 'Revision 2',
      });

      const history = await service.getRevisionHistory(postId);

      expect(history).toHaveLength(2);
      expect(history[0].revisionNumber).toBe(1);
      expect(history[1].revisionNumber).toBe(2);
      expect(history[0].newContent).toBe('Revision 1');
      expect(history[1].newContent).toBe('Revision 2');
    });

    it('should throw error for non-existent post', async () => {
      expect(service.getRevisionHistory('non-existent')).rejects.toThrow('Post not found');
    });

    it('should include all revision metadata', async () => {
      const result = await service.editPublishedPost(postId, 'alice.smith', {
        title: 'New Title',
        content: 'New content',
        changesSummary: 'Minor corrections',
      });

      const history = await service.getRevisionHistory(postId);
      const revision = history[0];

      expect(revision.id).toBeDefined();
      expect(revision.postId).toBe(postId);
      expect(revision.revisionNumber).toBe(1);
      expect(revision.editedBy).toBe('alice.smith');
      expect(revision.editedAt).toBeDefined();
      expect(revision.previousTitle).toBeDefined();
      expect(revision.previousContent).toBeDefined();
      expect(revision.newTitle).toBe('New Title');
      expect(revision.newContent).toBe('New content');
      expect(revision.changesSummary).toBe('Minor corrections');
      expect(revision.submissionId).toBeDefined();
    });
  });

  describe('getRevision()', () => {
    it('should retrieve a specific revision by ID', async () => {
      const post = await postService.createDraft({
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      const result = await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Updated',
      });

      const retrieved = await service.getRevision(result.revision.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(result.revision.id);
      expect(retrieved!.newContent).toBe('Updated');
    });

    it('should return undefined for non-existent revision', async () => {
      const revision = await service.getRevision('non-existent-revision');
      expect(revision).toBeUndefined();
    });
  });

  describe('getRevisionCount()', () => {
    it('should return 0 for post with no revisions', async () => {
      const post = await postService.createDraft({
        title: 'Test',
        content: 'Content',
        createdBy: 'alice.smith',
      });

      const count = await service.getRevisionCount(post.id);
      expect(count).toBe(0);
    });

    it('should return accurate revision count', async () => {
      const post = await postService.createDraft({
        title: 'Test',
        content: 'Content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      // First edit
      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Rev 1',
      });

      let count = await service.getRevisionCount(post.id);
      expect(count).toBe(1);

      // Approve for next edit
      const submissions = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions[1].id, 'admin', {});

      // Second edit
      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Rev 2',
      });

      count = await service.getRevisionCount(post.id);
      expect(count).toBe(2);
    });
  });

  describe('Comprehensive Workflow Tests', () => {
    it('should handle: publish -> edit -> re-approve -> re-edit -> re-approve', async () => {
      // Create and publish
      const post = await postService.createDraft({
        title: 'Original',
        content: 'Original',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      let sub = await approvalService.createSubmission(post.id, 'alice.smith', 'org-wide');
      await approvalService.approve(sub.id, 'admin', {});

      // First edit and re-approval
      const edit1 = await service.editPublishedPost(post.id, 'alice.smith', {
        title: 'First Edit',
      });

      const submissions1 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions1[1].id, 'admin', {});

      // Second edit and re-approval
      const edit2 = await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Second Edit',
      });

      const submissions2 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions2[2].id, 'admin', {});

      // Verify revision history
      const history = await service.getRevisionHistory(post.id);
      expect(history).toHaveLength(2);
      expect(history[0].revisionNumber).toBe(1);
      expect(history[1].revisionNumber).toBe(2);
    });

    it('should handle: publish -> edit -> feedback -> edit again -> approve', async () => {
      // Create and publish
      const post = await postService.createDraft({
        title: 'Original',
        content: 'Original',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      let sub = await approvalService.createSubmission(post.id, 'alice.smith', 'org-wide');
      await approvalService.approve(sub.id, 'admin', {});

      // Edit 1
      const edit1 = await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'First revision',
      });

      // Get feedback instead of approval
      const submissions1 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.sendFeedback(submissions1[1].id, 'admin', {
        message: 'Needs more detail',
      });

      // Edit again based on feedback
      const edit2 = await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Revised with more detail',
        changesSummary: 'Added more detail per feedback',
      });

      // Approve final version
      const submissions2 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions2[2].id, 'admin', {});

      // Verify revision history
      const history = await service.getRevisionHistory(post.id);
      expect(history).toHaveLength(2);
      expect(history[1].changesSummary).toContain('more detail');
    });

    it('should maintain full audit trail across edits', async () => {
      await databaseService.connect();

      const post = await postService.createDraft({
        title: 'Original',
        content: 'Original',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith', 'org-wide');
      await approvalService.approve(sub.id, 'admin', {});

      // Multiple edits
      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Edit 1',
      });

      const submissions1 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions1[1].id, 'admin', {});

      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Edit 2',
      });

      // Verify audit collection exists
      const collections = await databaseService.getCollections();
      expect(collections).toContain('audit');
    });

    it('should prevent edits from unauthorized users', async () => {
      const post = await postService.createDraft({
        title: 'Sensitive Post',
        content: 'Confidential',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      expect(
        service.editPublishedPost(post.id, 'eve.hacker', {
          content: 'Hacked content',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to re-approve edited content with audience override', async () => {
      const post = await postService.createDraft({
        title: 'Original',
        content: 'Original',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {
        proposedAudience: 'dept-only',
      });

      let sub = await approvalService.createSubmission(post.id, 'alice.smith', 'dept-only');
      await approvalService.approve(sub.id, 'admin', {});

      // Edit
      const edit = await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Updated content',
      });

      // Re-approve with broader audience
      const submissions = await approvalService.getSubmissionsForPost(post.id);
      const approved = await approvalService.approve(submissions[1].id, 'admin', {
        audience: 'org-wide',
      });

      expect(approved.finalAudience).toBe('org-wide');
    });
  });

  describe('Edge Cases & Validation', () => {
    it('should handle edit with only whitespace content', async () => {
      const post = await postService.createDraft({
        title: 'Test',
        content: 'Content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      expect(
        service.editPublishedPost(post.id, 'alice.smith', {
          content: '   ',
        }),
      ).rejects.toThrow('Content cannot be empty');
    });

    it('should allow partial updates (title only)', async () => {
      const post = await postService.createDraft({
        title: 'Original Title',
        content: 'Original content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      const result = await service.editPublishedPost(post.id, 'alice.smith', {
        title: 'New Title',
      });

      expect(result.post.title).toBe('New Title');
      expect(result.post.content).toBe('Original content');
    });

    it('should allow partial updates (content only)', async () => {
      const post = await postService.createDraft({
        title: 'Original Title',
        content: 'Original content',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      const result = await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'New content',
      });

      expect(result.post.title).toBe('Original Title');
      expect(result.post.content).toBe('New content');
    });

    it('should track media changes in revision history', async () => {
      const post = await postService.createDraft({
        title: 'Post with images',
        content: 'Content',
        createdBy: 'alice.smith',
        images: [{ url: 'https://example.com/old.jpg', size: 1000000, type: 'image/jpeg' }],
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      const sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      const result = await service.editPublishedPost(post.id, 'alice.smith', {
        images: [{ url: 'https://example.com/new.jpg', size: 1500000, type: 'image/jpeg' }],
      });

      expect(result.revision.changesSummary).toContain('Images updated');
    });

    it('should handle rapid successive edits with proper sequencing', async () => {
      const post = await postService.createDraft({
        title: 'Test',
        content: 'Content 1',
        createdBy: 'alice.smith',
      });

      await postService.submitForApproval(post.id, 'alice.smith', {});
      let sub = await approvalService.createSubmission(post.id, 'alice.smith');
      await approvalService.approve(sub.id, 'admin', {});

      // Edit 1
      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Content 2',
      });

      const submissions1 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions1[1].id, 'admin', {});

      // Edit 2
      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Content 3',
      });

      const submissions2 = await approvalService.getSubmissionsForPost(post.id);
      await approvalService.approve(submissions2[2].id, 'admin', {});

      // Edit 3
      await service.editPublishedPost(post.id, 'alice.smith', {
        content: 'Content 4',
      });

      const history = await service.getRevisionHistory(post.id);
      expect(history).toHaveLength(3);
      expect(history[0].newContent).toBe('Content 2');
      expect(history[1].newContent).toBe('Content 3');
      expect(history[2].newContent).toBe('Content 4');
    });
  });
});
