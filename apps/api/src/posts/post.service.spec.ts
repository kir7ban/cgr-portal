import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PostService } from './post.service';
import { DatabaseService } from '../database/database.service';

describe('PostService', () => {
  let service: PostService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostService, DatabaseService],
    }).compile();

    service = module.get<PostService>(PostService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    await databaseService.connect();
  });

  describe('Post Creation - Draft State', () => {
    it('should create draft post with text content', async () => {
      const post = await service.createDraft({
        title: 'My First Post',
        content: 'This is my first post',
        createdBy: 'user-1',
      });

      expect(post).toBeDefined();
      expect(post.title).toBe('My First Post');
      expect(post.state).toBe('DRAFT');
      expect(post.createdBy).toBe('user-1');
    });

    it('should create draft post visible only to creator', async () => {
      const post = await service.createDraft({
        title: 'Private Draft',
        content: 'Only creator can see this',
        createdBy: 'user-1',
      });

      const visibleToCreator = await service.getPostForUser(post.id, 'user-1');
      expect(visibleToCreator).toBeDefined();

      const visibleToOther = await service.getPostForUser(post.id, 'user-2');
      expect(visibleToOther).toBeUndefined();
    });
  });

  describe('Media Validation - Images', () => {
    it('should create post with 1 image', async () => {
      const post = await service.createDraft({
        title: 'Post with image',
        content: 'Check out this image',
        createdBy: 'user-1',
        images: [
          {
            url: 'https://example.com/image1.jpg',
            size: 1024 * 1024,
            type: 'image/jpeg',
          },
        ],
      });

      expect(post.images?.length).toBe(1);
    });

    it('should create post with up to 3 images', async () => {
      const post = await service.createDraft({
        title: 'Post with 3 images',
        content: 'Multiple images',
        createdBy: 'user-1',
        images: [
          { url: 'https://example.com/1.jpg', size: 1024 * 1024, type: 'image/jpeg' },
          { url: 'https://example.com/2.jpg', size: 1024 * 1024, type: 'image/jpeg' },
          { url: 'https://example.com/3.jpg', size: 1024 * 1024, type: 'image/jpeg' },
        ],
      });

      expect(post.images?.length).toBe(3);
    });

    it('should reject post with more than 3 images', async () => {
      await expect(
        service.createDraft({
          title: 'Too many images',
          content: 'This should fail',
          createdBy: 'user-1',
          images: [
            { url: 'https://example.com/1.jpg', size: 1024 * 1024, type: 'image/jpeg' },
            { url: 'https://example.com/2.jpg', size: 1024 * 1024, type: 'image/jpeg' },
            { url: 'https://example.com/3.jpg', size: 1024 * 1024, type: 'image/jpeg' },
            { url: 'https://example.com/4.jpg', size: 1024 * 1024, type: 'image/jpeg' },
          ],
        }),
      ).rejects.toThrow('Maximum 3 images allowed per post');
    });

    it('should reject image larger than 5MB', async () => {
      await expect(
        service.createDraft({
          title: 'Image too large',
          content: 'This should fail',
          createdBy: 'user-1',
          images: [
            {
              url: 'https://example.com/large.jpg',
              size: 6 * 1024 * 1024,
              type: 'image/jpeg',
            },
          ],
        }),
      ).rejects.toThrow('Image size cannot exceed 5MB');
    });

    it('should reject invalid image type', async () => {
      await expect(
        service.createDraft({
          title: 'Invalid image type',
          content: 'This should fail',
          createdBy: 'user-1',
          images: [
            {
              url: 'https://example.com/file.exe',
              size: 1024,
              type: 'application/octet-stream',
            },
          ],
        }),
      ).rejects.toThrow('Invalid image type');
    });
  });

  describe('Media Validation - Videos', () => {
    it('should allow YouTube video links', async () => {
      const post = await service.createDraft({
        title: 'Video post',
        content: 'Check this out',
        createdBy: 'user-1',
        video: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          source: 'youtube',
        },
      });

      expect(post.video?.source).toBe('youtube');
    });

    it('should reject direct video uploads', async () => {
      await expect(
        service.createDraft({
          title: 'Direct upload',
          content: 'This should fail',
          createdBy: 'user-1',
          video: {
            url: 'https://example.com/video.mp4',
            source: 'direct',
          },
        }),
      ).rejects.toThrow('Direct video uploads not allowed');
    });
  });

  describe('Media Validation - Documents', () => {
    it('should allow PDF documents', async () => {
      const post = await service.createDraft({
        title: 'Document post',
        content: 'Important doc',
        createdBy: 'user-1',
        documents: [
          {
            url: 'https://example.com/report.pdf',
            name: 'report.pdf',
            size: 2 * 1024 * 1024,
            type: 'application/pdf',
          },
        ],
      });

      expect(post.documents?.length).toBe(1);
    });

    it('should reject documents larger than 10MB', async () => {
      await expect(
        service.createDraft({
          title: 'Document too large',
          content: 'This should fail',
          createdBy: 'user-1',
          documents: [
            {
              url: 'https://example.com/large.pdf',
              name: 'large.pdf',
              size: 11 * 1024 * 1024,
              type: 'application/pdf',
            },
          ],
        }),
      ).rejects.toThrow('Document size cannot exceed 10MB');
    });

    it('should reject unsupported document types', async () => {
      await expect(
        service.createDraft({
          title: 'Bad file',
          content: 'This should fail',
          createdBy: 'user-1',
          documents: [
            {
              url: 'https://example.com/file.exe',
              name: 'file.exe',
              size: 1024,
              type: 'application/octet-stream',
            },
          ],
        }),
      ).rejects.toThrow('Unsupported document type');
    });
  });

  describe('Post State Transitions', () => {
    it('should transition from DRAFT to SUBMITTED', async () => {
      const draft = await service.createDraft({
        title: 'Ready to submit',
        content: 'Let me publish this',
        createdBy: 'user-1',
      });

      const submitted = await service.submitForApproval(draft.id, 'user-1', {
        proposedAudience: 'org-wide',
      });

      expect(submitted.state).toBe('SUBMITTED');
    });

    it('should reject submission from non-creator', async () => {
      const draft = await service.createDraft({
        title: 'Created by user-1',
        content: 'Someone else cannot submit this',
        createdBy: 'user-1',
      });

      await expect(service.submitForApproval(draft.id, 'user-2', {})).rejects.toThrow(
        'Only creator can submit',
      );
    });

    it('should not allow submission of published posts', async () => {
      const draft = await service.createDraft({
        title: 'Already published',
        content: 'Cannot submit again',
        createdBy: 'user-1',
      });

      await service.updatePostState(draft.id, 'PUBLISHED');

      await expect(service.submitForApproval(draft.id, 'user-1', {})).rejects.toThrow(
        'Can only submit DRAFT posts',
      );
    });
  });

  describe('Rich Text Content', () => {
    it('should support rich text formatting', async () => {
      const richContent = '**Bold** *italic* [link](https://example.com) - List item';
      const post = await service.createDraft({
        title: 'Rich post',
        content: richContent,
        createdBy: 'user-1',
      });

      expect(post.content).toBe(richContent);
    });

    it('should validate content is not empty', async () => {
      await expect(
        service.createDraft({
          title: 'Empty post',
          content: '',
          createdBy: 'user-1',
        }),
      ).rejects.toThrow('Content cannot be empty');
    });
  });
});
