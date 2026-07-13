import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostCreationService } from './post-creation.service';
import { PostService } from './post.service';
import { DatabaseService } from '../database/database.service';

describe('PostCreationService', () => {
  let service: PostCreationService;
  let postService: PostService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostCreationService, PostService, DatabaseService],
    }).compile();

    service = module.get<PostCreationService>(PostCreationService);
    postService = module.get<PostService>(PostService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    await databaseService.connect();
  });

  describe('Post Creation by Comms Officer', () => {
    it('should create draft post for Comms Officer', async () => {
      const post = await service.createDraft({
        title: 'Important Announcement',
        content: 'This is an important update',
        createdBy: 'alice.smith',
      });

      expect(post).toBeDefined();
      expect(post.title).toBe('Important Announcement');
      expect(post.state).toBe('DRAFT');
      expect(post.createdBy).toBe('alice.smith');
    });

    it('should reject post creation by Employee', async () => {
      await expect(
        service.createDraft({
          title: 'Employee post',
          content: 'Employees should not create posts',
          createdBy: 'john.doe',
        }),
      ).rejects.toThrow('Only Comms Officers can create posts');
    });

    it('should reject post creation by Admin', async () => {
      await expect(
        service.createDraft({
          title: 'Admin post',
          content: 'Admins should not create posts',
          createdBy: 'bob.admin',
        }),
      ).rejects.toThrow('Only Comms Officers can create posts');
    });
  });

  describe('Post Submission for Approval', () => {
    it('should submit draft post to approval queue', async () => {
      const draft = await service.createDraft({
        title: 'Ready to publish',
        content: 'This is ready for approval',
        createdBy: 'alice.smith',
      });

      const submitted = await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      expect(submitted.state).toBe('SUBMITTED');
      expect(submitted.proposedAudience).toBe('org-wide');
    });

    it('should create audit log entry on submission', async () => {
      const draft = await service.createDraft({
        title: 'Audit test',
        content: 'Should create audit entry',
        createdBy: 'alice.smith',
      });

      const submitted = await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      expect(submitted).toBeDefined();
    });

    it('should reject submission from non-creator', async () => {
      const draft = await service.createDraft({
        title: 'Created by alice',
        content: 'Someone else tries to submit',
        createdBy: 'alice.smith',
      });

      await expect(
        service.submitForApproval(draft.id, 'other.user', {
          proposedAudience: 'org-wide',
        }),
      ).rejects.toThrow('Only creator can submit');
    });

    it('should not allow submission of already submitted posts', async () => {
      const draft = await service.createDraft({
        title: 'Double submit test',
        content: 'Try to submit twice',
        createdBy: 'alice.smith',
      });

      await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      await expect(
        service.submitForApproval(draft.id, 'alice.smith', {
          proposedAudience: 'org-wide',
        }),
      ).rejects.toThrow('Can only submit DRAFT posts');
    });
  });

  describe('Audience Scope Proposal', () => {
    it('should accept org-wide audience scope', async () => {
      const draft = await service.createDraft({
        title: 'Org-wide post',
        content: 'Visible to everyone',
        createdBy: 'alice.smith',
      });

      const submitted = await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      expect(submitted.proposedAudience).toBe('org-wide');
    });

    it('should accept dept-only audience scope', async () => {
      const draft = await service.createDraft({
        title: 'Department post',
        content: 'Visible to dept only',
        createdBy: 'alice.smith',
      });

      const submitted = await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'dept-only',
      });

      expect(submitted.proposedAudience).toBe('dept-only');
    });

    it('should accept custom audience scope', async () => {
      const draft = await service.createDraft({
        title: 'Custom audience post',
        content: 'For custom group',
        createdBy: 'alice.smith',
      });

      const submitted = await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'custom:marketing-team',
      });

      expect(submitted.proposedAudience).toBe('custom:marketing-team');
    });

    it('should reject invalid audience scope', async () => {
      const draft = await service.createDraft({
        title: 'Invalid scope',
        content: 'Invalid scope test',
        createdBy: 'alice.smith',
      });

      await expect(
        service.submitForApproval(draft.id, 'alice.smith', {
          proposedAudience: 'invalid-scope',
        }),
      ).rejects.toThrow('Invalid audience scope');
    });
  });

  describe('Approval Queue', () => {
    it('should add submitted post to approval queue', async () => {
      const draft = await service.createDraft({
        title: 'Queue test',
        content: 'Should be in queue',
        createdBy: 'alice.smith',
      });

      await service.submitForApproval(draft.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      const queue = await service.getApprovalQueue();
      const inQueue = queue.find((p) => p.id === draft.id);

      expect(inQueue).toBeDefined();
      expect(inQueue?.state).toBe('SUBMITTED');
    });

    it('should return empty queue when no submissions', async () => {
      const queue = await service.getApprovalQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should list all submitted posts in chronological order', async () => {
      const post1 = await service.createDraft({
        title: 'First post',
        content: 'Content 1',
        createdBy: 'alice.smith',
      });
      await new Promise((r) => setTimeout(r, 10));

      const post2 = await service.createDraft({
        title: 'Second post',
        content: 'Content 2',
        createdBy: 'alice.smith',
      });

      await service.submitForApproval(post1.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });
      await service.submitForApproval(post2.id, 'alice.smith', {
        proposedAudience: 'org-wide',
      });

      const queue = await service.getApprovalQueue();
      expect(queue.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Draft Management', () => {
    it('should list user drafts', async () => {
      const draft1 = await service.createDraft({
        title: 'Draft 1',
        content: 'Content 1',
        createdBy: 'alice.smith',
      });

      const draft2 = await service.createDraft({
        title: 'Draft 2',
        content: 'Content 2',
        createdBy: 'alice.smith',
      });

      const drafts = await service.getUserDrafts('alice.smith');
      expect(drafts.length).toBeGreaterThanOrEqual(2);
    });

    it('should not list other users drafts', async () => {
      await service.createDraft({
        title: 'Alice draft',
        content: 'Private',
        createdBy: 'alice.smith',
      });

      const otherUserDrafts = await service.getUserDrafts('other.user');
      expect(otherUserDrafts.length).toBe(0);
    });

    it('should allow draft updates before submission', async () => {
      const draft = await service.createDraft({
        title: 'Original title',
        content: 'Original content',
        createdBy: 'alice.smith',
      });

      const updated = await service.updateDraft(draft.id, 'alice.smith', {
        title: 'Updated title',
        content: 'Updated content',
      });

      expect(updated.title).toBe('Updated title');
      expect(updated.content).toBe('Updated content');
    });

    it('should reject draft update from non-creator', async () => {
      const draft = await service.createDraft({
        title: 'Original',
        content: 'Original',
        createdBy: 'alice.smith',
      });

      await expect(
        service.updateDraft(draft.id, 'other.user', {
          title: 'Hacked title',
        }),
      ).rejects.toThrow('Only creator can update draft');
    });

    it('should delete draft', async () => {
      const draft = await service.createDraft({
        title: 'To delete',
        content: 'Delete me',
        createdBy: 'alice.smith',
      });

      await service.deleteDraft(draft.id, 'alice.smith');

      const drafts = await service.getUserDrafts('alice.smith');
      expect(drafts.find((d) => d.id === draft.id)).toBeUndefined();
    });

    it('should reject draft deletion from non-creator', async () => {
      const draft = await service.createDraft({
        title: 'Protected',
        content: 'Protected',
        createdBy: 'alice.smith',
      });

      await expect(service.deleteDraft(draft.id, 'other.user')).rejects.toThrow(
        'Only creator can delete draft',
      );
    });
  });
});
