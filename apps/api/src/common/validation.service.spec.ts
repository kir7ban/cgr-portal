import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { BadRequestException } from '@nestjs/common';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateMediaFiles', () => {
    describe('Image Validation', () => {
      it('should accept valid images within limits', () => {
        const images = [
          { url: 'https://example.com/1.jpg', size: 1024 * 1024, type: 'image/jpeg' },
          { url: 'https://example.com/2.png', size: 2 * 1024 * 1024, type: 'image/png' },
        ];

        expect(() => service.validateMediaFiles({ images })).not.toThrow();
      });

      it('should reject when more than 3 images', () => {
        const images = [
          { url: 'https://example.com/1.jpg', size: 1024, type: 'image/jpeg' },
          { url: 'https://example.com/2.jpg', size: 1024, type: 'image/jpeg' },
          { url: 'https://example.com/3.jpg', size: 1024, type: 'image/jpeg' },
          { url: 'https://example.com/4.jpg', size: 1024, type: 'image/jpeg' },
        ];

        expect(() => service.validateMediaFiles({ images })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ images })).toThrow(
          'Maximum 3 images allowed per post',
        );
      });

      it('should reject invalid image types', () => {
        const images = [
          { url: 'https://example.com/file.bmp', size: 1024, type: 'image/bmp' },
        ];

        expect(() => service.validateMediaFiles({ images })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ images })).toThrow('Invalid image type');
      });

      it('should reject images exceeding 5MB', () => {
        const images = [
          { url: 'https://example.com/large.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' },
        ];

        expect(() => service.validateMediaFiles({ images })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ images })).toThrow(
          'Image size cannot exceed 5MB',
        );
      });

      it('should accept all allowed image types', () => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        allowedTypes.forEach((type) => {
          const images = [{ url: 'https://example.com/img', size: 1024, type }];
          expect(() => service.validateMediaFiles({ images })).not.toThrow();
        });
      });

      it('should accept null/undefined images', () => {
        expect(() => service.validateMediaFiles({ images: undefined })).not.toThrow();
        expect(() => service.validateMediaFiles({ images: null })).not.toThrow();
      });
    });

    describe('Video Validation', () => {
      it('should accept valid youtube video', () => {
        const video = { url: 'https://youtube.com/watch?v=abc', source: 'youtube' as const };
        expect(() => service.validateMediaFiles({ video })).not.toThrow();
      });

      it('should accept valid internal video', () => {
        const video = { url: 'https://internal.bosch.com/video.mp4', source: 'internal' as const };
        expect(() => service.validateMediaFiles({ video })).not.toThrow();
      });

      it('should reject direct video uploads', () => {
        const video = { url: 'https://example.com/video.mp4', source: 'direct' as any };
        expect(() => service.validateMediaFiles({ video })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ video })).toThrow(
          'Direct video uploads not allowed',
        );
      });

      it('should reject invalid video sources', () => {
        const video = { url: 'https://example.com/video', source: 'vimeo' as any };
        expect(() => service.validateMediaFiles({ video })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ video })).toThrow(
          'Video source must be youtube or internal',
        );
      });

      it('should accept null/undefined video', () => {
        expect(() => service.validateMediaFiles({ video: undefined })).not.toThrow();
        expect(() => service.validateMediaFiles({ video: null })).not.toThrow();
      });
    });

    describe('Document Validation', () => {
      it('should accept valid PDF document', () => {
        const documents = [
          {
            url: 'https://example.com/doc.pdf',
            name: 'document.pdf',
            size: 1024 * 1024,
            type: 'application/pdf',
          },
        ];
        expect(() => service.validateMediaFiles({ documents })).not.toThrow();
      });

      it('should accept all allowed document types', () => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        allowedTypes.forEach((type) => {
          const documents = [
            { url: 'https://example.com/doc', name: 'doc', size: 1024, type },
          ];
          expect(() => service.validateMediaFiles({ documents })).not.toThrow();
        });
      });

      it('should reject unsupported document types', () => {
        const documents = [
          {
            url: 'https://example.com/file.txt',
            name: 'file.txt',
            size: 1024,
            type: 'text/plain',
          },
        ];

        expect(() => service.validateMediaFiles({ documents })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ documents })).toThrow(
          'Unsupported document type',
        );
      });

      it('should reject documents exceeding 10MB', () => {
        const documents = [
          {
            url: 'https://example.com/large.pdf',
            name: 'large.pdf',
            size: 11 * 1024 * 1024,
            type: 'application/pdf',
          },
        ];

        expect(() => service.validateMediaFiles({ documents })).toThrow(BadRequestException);
        expect(() => service.validateMediaFiles({ documents })).toThrow(
          'Document size cannot exceed 10MB',
        );
      });

      it('should accept null/undefined documents', () => {
        expect(() => service.validateMediaFiles({ documents: undefined })).not.toThrow();
        expect(() => service.validateMediaFiles({ documents: null })).not.toThrow();
      });
    });

    describe('Combined Media Validation', () => {
      it('should validate all media types together', () => {
        const images = [
          { url: 'https://example.com/1.jpg', size: 1024 * 1024, type: 'image/jpeg' },
        ];
        const video = { url: 'https://youtube.com/watch?v=abc', source: 'youtube' as const };
        const documents = [
          {
            url: 'https://example.com/doc.pdf',
            name: 'document.pdf',
            size: 1024 * 1024,
            type: 'application/pdf',
          },
        ];

        expect(() => service.validateMediaFiles({ images, video, documents })).not.toThrow();
      });

      it('should handle empty arrays', () => {
        expect(() => service.validateMediaFiles({ images: [], documents: [] })).not.toThrow();
      });
    });
  });

  describe('validatePagination', () => {
    it('should accept valid pagination params', () => {
      expect(() => service.validatePagination({ page: 1, pageSize: 10 })).not.toThrow();
      expect(() => service.validatePagination({ page: 5, pageSize: 50 })).not.toThrow();
      expect(() => service.validatePagination({ page: 1, pageSize: 100 })).not.toThrow();
    });

    it('should reject page less than 1', () => {
      expect(() => service.validatePagination({ page: 0, pageSize: 10 })).toThrow(
        BadRequestException,
      );
      expect(() => service.validatePagination({ page: -1, pageSize: 10 })).toThrow(
        'Page must be a positive integer',
      );
    });

    it('should reject pageSize less than 1', () => {
      expect(() => service.validatePagination({ page: 1, pageSize: 0 })).toThrow(
        BadRequestException,
      );
      expect(() => service.validatePagination({ page: 1, pageSize: -5 })).toThrow(
        'PageSize must be a positive integer',
      );
    });

    it('should reject pageSize greater than 100', () => {
      expect(() => service.validatePagination({ page: 1, pageSize: 101 })).toThrow(
        BadRequestException,
      );
      expect(() => service.validatePagination({ page: 1, pageSize: 200 })).toThrow(
        'PageSize cannot exceed 100',
      );
    });

    it('should reject non-number page', () => {
      expect(() =>
        service.validatePagination({ page: '1' as any, pageSize: 10 }),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validatePagination({ page: null as any, pageSize: 10 }),
      ).toThrow('Page must be a positive integer');
    });

    it('should reject non-number pageSize', () => {
      expect(() =>
        service.validatePagination({ page: 1, pageSize: '10' as any }),
      ).toThrow(BadRequestException);
      expect(() =>
        service.validatePagination({ page: 1, pageSize: null as any }),
      ).toThrow('PageSize must be a positive integer');
    });

    it('should reject missing pagination object', () => {
      expect(() => service.validatePagination(null as any)).toThrow(BadRequestException);
      expect(() => service.validatePagination(undefined as any)).toThrow(
        'Pagination params required',
      );
    });

    it('should reject non-object pagination', () => {
      expect(() => service.validatePagination('invalid' as any)).toThrow(BadRequestException);
      expect(() => service.validatePagination(123 as any)).toThrow('Pagination params required');
    });

    it('should handle boundary values correctly', () => {
      expect(() => service.validatePagination({ page: 1, pageSize: 1 })).not.toThrow();
      expect(() => service.validatePagination({ page: 1000, pageSize: 100 })).not.toThrow();
    });
  });
});
