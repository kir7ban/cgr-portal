import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreatePostDto {
  title: string;
  content: string;
  createdBy: string;
  images?: Array<{ url: string; size: number; type: string }>;
  video?: { url: string; source: 'youtube' | 'internal' };
  documents?: Array<{ url: string; name: string; size: number; type: string }>;
}

export interface PostDocument {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  state: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED' | 'REVOKED' | 'ARCHIVED';
  images?: Array<{ url: string; size: number; type: string }>;
  video?: { url: string; source: string };
  documents?: Array<{ url: string; name: string; size: number; type: string }>;
  proposedAudience?: string;
  createdAt: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES_PER_POST = 3;

@Injectable()
export class PostService {
  private posts: Map<string, PostDocument> = new Map();

  constructor(private databaseService: DatabaseService) {}

  async createDraft(dto: CreatePostDto): Promise<PostDocument> {
    this.validateContent(dto.content);
    this.validateImages(dto.images);
    this.validateVideo(dto.video);
    this.validateDocuments(dto.documents);

    const post: PostDocument = {
      id: this.generateId(),
      title: dto.title,
      content: dto.content,
      createdBy: dto.createdBy,
      state: 'DRAFT',
      images: dto.images,
      video: dto.video,
      documents: dto.documents,
      createdAt: new Date().toISOString(),
    };

    this.posts.set(post.id, post);
    return post;
  }

  async getPostForUser(postId: string, userId: string): Promise<PostDocument | undefined> {
    const post = this.posts.get(postId);

    if (!post) return undefined;

    if (post.state === 'DRAFT' && post.createdBy !== userId) {
      return undefined;
    }

    if (post.state === 'PUBLISHED') {
      return post;
    }

    if (post.createdBy === userId) {
      return post;
    }

    return undefined;
  }

  async submitForApproval(
    postId: string,
    userId: string,
    options: { proposedAudience?: string },
  ): Promise<PostDocument> {
    const post = this.posts.get(postId);

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    if (post.createdBy !== userId) {
      throw new ForbiddenException('Only creator can submit');
    }

    if (post.state !== 'DRAFT') {
      throw new BadRequestException('Can only submit DRAFT posts');
    }

    post.state = 'SUBMITTED';
    post.proposedAudience = options.proposedAudience;

    this.posts.set(postId, post);
    return post;
  }

  async updatePostState(postId: string, newState: string): Promise<PostDocument> {
    const post = this.posts.get(postId);

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    post.state = newState as any;
    this.posts.set(postId, post);
    return post;
  }

  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }
  }

  private validateImages(images?: Array<{ url: string; size: number; type: string }>): void {
    if (!images) return;

    if (images.length > MAX_IMAGES_PER_POST) {
      throw new BadRequestException('Maximum 3 images allowed per post');
    }

    for (const image of images) {
      if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
        throw new BadRequestException('Invalid image type');
      }

      if (image.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException('Image size cannot exceed 5MB');
      }
    }
  }

  private validateVideo(video?: { url: string; source: string }): void {
    if (!video) return;

    if (video.source === 'direct') {
      throw new BadRequestException('Direct video uploads not allowed');
    }

    if (video.source !== 'youtube' && video.source !== 'internal') {
      throw new BadRequestException('Video source must be youtube or internal');
    }
  }

  private validateDocuments(
    documents?: Array<{ url: string; name: string; size: number; type: string }>,
  ): void {
    if (!documents) return;

    for (const doc of documents) {
      if (!ALLOWED_DOCUMENT_TYPES.includes(doc.type)) {
        throw new BadRequestException('Unsupported document type');
      }

      if (doc.size > MAX_DOCUMENT_SIZE) {
        throw new BadRequestException('Document size cannot exceed 10MB');
      }
    }
  }

  private generateId(): string {
    return `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
