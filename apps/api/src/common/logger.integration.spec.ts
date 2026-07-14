import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PostService } from '../posts/post.service';
import { EditService } from '../advanced/edit.service';
import { CommentService } from '../engagement/comment.service';
import { ReactionService } from '../engagement/reaction.service';
import { ShareService } from '../engagement/share.service';
import { ApprovalService } from '../approval/approval.service';
import { ArchiveService } from '../advanced/archive.service';
import { RevocationService } from '../advanced/revoke.service';
import { AudienceService } from '../audiences/audience.service';
import { FeedService } from '../feed/feed.service';
import { DatabaseService } from '../database/database.service';

describe('Logger Integration', () => {
  let postService: PostService;
  let editService: EditService;
  let commentService: CommentService;
  let reactionService: ReactionService;
  let shareService: ShareService;
  let approvalService: ApprovalService;
  let archiveService: ArchiveService;
  let revocationService: RevocationService;
  let audienceService: AudienceService;
  let feedService: FeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        EditService,
        CommentService,
        ReactionService,
        ShareService,
        ApprovalService,
        ArchiveService,
        RevocationService,
        AudienceService,
        FeedService,
        DatabaseService,
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
    editService = module.get<EditService>(EditService);
    commentService = module.get<CommentService>(CommentService);
    reactionService = module.get<ReactionService>(ReactionService);
    shareService = module.get<ShareService>(ShareService);
    approvalService = module.get<ApprovalService>(ApprovalService);
    archiveService = module.get<ArchiveService>(ArchiveService);
    revocationService = module.get<RevocationService>(RevocationService);
    audienceService = module.get<AudienceService>(AudienceService);
    feedService = module.get<FeedService>(FeedService);
  });

  describe('Logger Injection', () => {
    it('should have logger injected in PostService', () => {
      expect((postService as any).logger).toBeDefined();
      expect((postService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in EditService', () => {
      expect((editService as any).logger).toBeDefined();
      expect((editService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in CommentService', () => {
      expect((commentService as any).logger).toBeDefined();
      expect((commentService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in ReactionService', () => {
      expect((reactionService as any).logger).toBeDefined();
      expect((reactionService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in ShareService', () => {
      expect((shareService as any).logger).toBeDefined();
      expect((shareService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in ApprovalService', () => {
      expect((approvalService as any).logger).toBeDefined();
      expect((approvalService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in ArchiveService', () => {
      expect((archiveService as any).logger).toBeDefined();
      expect((archiveService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in RevocationService', () => {
      expect((revocationService as any).logger).toBeDefined();
      expect((revocationService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in AudienceService', () => {
      expect((audienceService as any).logger).toBeDefined();
      expect((audienceService as any).logger).toBeInstanceOf(Logger);
    });

    it('should have logger injected in FeedService', () => {
      expect((feedService as any).logger).toBeDefined();
      expect((feedService as any).logger).toBeInstanceOf(Logger);
    });
  });

  describe('Logger Usage on Mutations', () => {
    it('should log when creating a post draft', async () => {
      const logSpy = jest.spyOn((postService as any).logger, 'log');

      await postService.createDraft({
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-123',
      });

      expect(logSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('draft'),
        expect.any(String),
      );
    });

    it('should log when submitting a post for approval', async () => {
      const logSpy = jest.spyOn((postService as any).logger, 'log');

      const post = await postService.createDraft({
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-123',
      });

      await postService.submitForApproval(post.id, 'user-123', {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('submitted'),
        expect.any(String),
      );
    });

    it('should log when adding a comment', async () => {
      const logSpy = jest.spyOn((commentService as any).logger, 'log');

      await commentService.addComment('post-123', 'user-456', 'Great post!');

      expect(logSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('comment'),
        expect.any(String),
      );
    });

    it('should log when adding a reaction', async () => {
      const logSpy = jest.spyOn((reactionService as any).logger, 'log');

      await reactionService.addReaction('post-123', 'user-456', 'like');

      expect(logSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('reaction'),
        expect.any(String),
      );
    });

    it('should log when sharing a post', async () => {
      const logSpy = jest.spyOn((shareService as any).logger, 'log');

      await shareService.sharePost('post-123', 'user-456', 'email');

      expect(logSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('share'),
        expect.any(String),
      );
    });

    it('should log when approving a submission', async () => {
      const logSpy = jest.spyOn((approvalService as any).logger, 'log');

      const submission = await approvalService.createSubmission(
        'post-123',
        'user-456',
        'audience-1',
      );

      await approvalService.approveSubmission(
        submission.id,
        'admin-123',
        'audience-1',
        'Looks good',
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('approved'),
        expect.any(String),
      );
    });

    it('should log when rejecting a submission', async () => {
      const logSpy = jest.spyOn((approvalService as any).logger, 'log');

      const submission = await approvalService.createSubmission(
        'post-123',
        'user-456',
        'audience-1',
      );

      await approvalService.rejectSubmission(submission.id, 'admin-123', 'Needs revision');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('rejected'),
        expect.any(String),
      );
    });

    it('should log when archiving a post', async () => {
      const logSpy = jest.spyOn((archiveService as any).logger, 'log');

      const post = await postService.createDraft({
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-123',
      });

      await archiveService.archivePost(post.id, 'admin-123', 'Outdated content');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('archived'),
        expect.any(String),
      );
    });

    it('should log when revoking a post', async () => {
      const logSpy = jest.spyOn((revocationService as any).logger, 'log');

      const post = await postService.createDraft({
        title: 'Test Post',
        content: 'Test content',
        createdBy: 'user-123',
      });
      await postService.updatePostState(post.id, 'PUBLISHED');

      await revocationService.revokePost(post.id, 'user-123', 'Incorrect information');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('revoked'),
        expect.any(String),
      );
    });
  });

  describe('Logger Context', () => {
    it('should use correct service name context for PostService', () => {
      const logger = (postService as any).logger;
      expect(logger.context).toBe('PostService');
    });

    it('should use correct service name context for EditService', () => {
      const logger = (editService as any).logger;
      expect(logger.context).toBe('EditService');
    });

    it('should use correct service name context for CommentService', () => {
      const logger = (commentService as any).logger;
      expect(logger.context).toBe('CommentService');
    });
  });
});
