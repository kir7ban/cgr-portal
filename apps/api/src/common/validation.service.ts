import { Injectable, BadRequestException } from '@nestjs/common';

export interface MediaFiles {
  images?: Array<{ url: string; size: number; type: string }> | null;
  video?: { url: string; source: string } | null;
  documents?: Array<{ url: string; name: string; size: number; type: string }> | null;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * ValidationService: Centralized validation logic for media files and pagination
 *
 * Responsibilities:
 * - Validate images (type, size, count)
 * - Validate videos (source)
 * - Validate documents (type, size)
 * - Validate pagination parameters
 *
 * This service consolidates validation logic previously duplicated across:
 * - PostService
 * - EditService
 * - CommentService
 */
@Injectable()
export class ValidationService {
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_IMAGES_PER_POST = 3;
  private readonly MAX_PAGE_SIZE = 100;

  /**
   * Validate media files (images, videos, documents)
   *
   * @param mediaFiles - Object containing images, video, and documents
   * @throws BadRequestException if validation fails
   *
   * Rules:
   * - Images: max 3, types (jpeg, png, gif, webp), max 5MB each
   * - Videos: source must be 'youtube' or 'internal', not 'direct'
   * - Documents: types (pdf, doc, docx, xls, xlsx), max 10MB each
   */
  validateMediaFiles(mediaFiles: MediaFiles): void {
    this.validateImages(mediaFiles.images);
    this.validateVideo(mediaFiles.video);
    this.validateDocuments(mediaFiles.documents);
  }

  /**
   * Validate pagination parameters
   *
   * @param pagination - Pagination params (page, pageSize)
   * @throws BadRequestException if validation fails
   *
   * Rules:
   * - pagination must be an object
   * - page must be a positive integer >= 1
   * - pageSize must be a positive integer (1-100)
   */
  validatePagination(pagination: PaginationParams): void {
    if (!pagination || typeof pagination !== 'object') {
      throw new BadRequestException('Pagination params required');
    }

    if (typeof pagination.page !== 'number' || pagination.page < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }

    if (typeof pagination.pageSize !== 'number' || pagination.pageSize < 1) {
      throw new BadRequestException('PageSize must be a positive integer');
    }

    if (pagination.pageSize > this.MAX_PAGE_SIZE) {
      throw new BadRequestException('PageSize cannot exceed 100');
    }
  }

  /**
   * Validate images
   * @private
   */
  private validateImages(images?: Array<{ url: string; size: number; type: string }> | null): void {
    if (!images) return;

    if (images.length > this.MAX_IMAGES_PER_POST) {
      throw new BadRequestException('Maximum 3 images allowed per post');
    }

    for (const image of images) {
      if (!this.ALLOWED_IMAGE_TYPES.includes(image.type)) {
        throw new BadRequestException('Invalid image type');
      }

      if (image.size > this.MAX_IMAGE_SIZE) {
        throw new BadRequestException('Image size cannot exceed 5MB');
      }
    }
  }

  /**
   * Validate video
   * @private
   */
  private validateVideo(video?: { url: string; source: string } | null): void {
    if (!video) return;

    if (video.source === 'direct') {
      throw new BadRequestException('Direct video uploads not allowed');
    }

    if (video.source !== 'youtube' && video.source !== 'internal') {
      throw new BadRequestException('Video source must be youtube or internal');
    }
  }

  /**
   * Validate documents
   * @private
   */
  private validateDocuments(
    documents?: Array<{ url: string; name: string; size: number; type: string }> | null,
  ): void {
    if (!documents) return;

    for (const doc of documents) {
      if (!this.ALLOWED_DOCUMENT_TYPES.includes(doc.type)) {
        throw new BadRequestException('Unsupported document type');
      }

      if (doc.size > this.MAX_DOCUMENT_SIZE) {
        throw new BadRequestException('Document size cannot exceed 10MB');
      }
    }
  }
}
