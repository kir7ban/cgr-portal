import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PostState, POST_STATES } from '../domain/state-types';
import { ValidationService } from '../common/validation.service';

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
  state: PostState;
  images?: Array<{ url: string; size: number; type: string }>;
  video?: { url: string; source: string };
  documents?: Array<{ url: string; name: string; size: number; type: string }>;
  proposedAudience?: string;
  createdAt: string;
}

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);
  private posts: Map<string, PostDocument> = new Map();

  constructor(
    private databaseService: DatabaseService,
    private validationService: ValidationService,
  ) {}

  async createDraft(dto: CreatePostDto): Promise<PostDocument> {
    this.validateContent(dto.content);
    this.validationService.validateMediaFiles({
      images: dto.images,
      video: dto.video,
      documents: dto.documents,
    });

    const post: PostDocument = {
      id: this.generateId(),
      title: dto.title,
      content: dto.content,
      createdBy: dto.createdBy,
      state: POST_STATES.DRAFT,
      images: dto.images,
      video: dto.video,
      documents: dto.documents,
      createdAt: new Date().toISOString(),
    };

    this.posts.set(post.id, post);
    this.logger.log(`Created draft post ${post.id} by user ${dto.createdBy}`);
    return post;
  }

  async getPostForUser(postId: string, userId: string): Promise<PostDocument | undefined> {
    const post = this.posts.get(postId);

    if (!post) return undefined;

    if (post.state === POST_STATES.DRAFT && post.createdBy !== userId) {
      return undefined;
    }

    if (post.state === POST_STATES.PUBLISHED) {
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

    if (post.state !== POST_STATES.DRAFT) {
      throw new BadRequestException('Can only submit DRAFT posts');
    }

    post.state = POST_STATES.SUBMITTED;
    post.proposedAudience = options.proposedAudience;

    this.posts.set(postId, post);
    this.logger.log(`Post ${postId} submitted for approval by user ${userId}`);
    return post;
  }

  async updatePostState(postId: string, newState: PostState): Promise<PostDocument> {
    const post = this.posts.get(postId);

    if (!post) {
      throw new BadRequestException('Post not found');
    }

    const previousState = post.state;
    post.state = newState;
    this.posts.set(postId, post);
    this.logger.log(`Post ${postId} state changed from ${previousState} to ${newState}`);
    return post;
  }

  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }
  }

  private generateId(): string {
    return `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
