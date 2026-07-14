import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostService, PostDocument, CreatePostDto } from './post.service';
import { DatabaseService } from '../database/database.service';
import { AuthorizationService } from '../auth/authorization.service';

const VALID_AUDIENCE_SCOPES = ['org-wide', 'dept-only'];
const COMMS_OFFICER_ROLE = 'COMMS_OFFICER';

@Injectable()
export class PostCreationService {
  private submittedPosts: Map<string, PostDocument & { submittedAt: string }> = new Map();
  private userDrafts: Map<string, Map<string, PostDocument>> = new Map();

  constructor(
    private postService: PostService,
    private databaseService: DatabaseService,
    private authorizationService: AuthorizationService,
  ) {}

  async createDraft(dto: CreatePostDto): Promise<PostDocument> {
    this.authorizationService.enforceRole(dto.createdBy, 'COMMS_OFFICER', 'Only Comms Officers can create posts');

    const post = await this.postService.createDraft(dto);

    if (!this.userDrafts.has(dto.createdBy)) {
      this.userDrafts.set(dto.createdBy, new Map());
    }
    this.userDrafts.get(dto.createdBy)!.set(post.id, post);

    return post;
  }

  async submitForApproval(
    postId: string,
    userId: string,
    options: { proposedAudience?: string },
  ): Promise<PostDocument> {
    const post = await this.postService.submitForApproval(postId, userId, options);

    if (options.proposedAudience) {
      this.validateAudienceScope(options.proposedAudience);
    }

    this.submittedPosts.set(postId, {
      ...post,
      submittedAt: new Date().toISOString(),
    });

    await this.databaseService.insertAudit({
      id: `audit-submit-${postId}`,
      timestamp: new Date().toISOString(),
      actor: userId,
      action: 'submit_post',
      resource: 'post',
      resourceId: postId,
    });

    if (this.userDrafts.has(userId)) {
      this.userDrafts.get(userId)!.delete(postId);
    }

    return post;
  }

  async getApprovalQueue(): Promise<PostDocument[]> {
    return Array.from(this.submittedPosts.values());
  }

  async getUserDrafts(userId: string): Promise<PostDocument[]> {
    const userDrafts = this.userDrafts.get(userId);
    return userDrafts ? Array.from(userDrafts.values()) : [];
  }

  async updateDraft(
    postId: string,
    userId: string,
    updates: Partial<CreatePostDto>,
  ): Promise<PostDocument> {
    const userDrafts = this.userDrafts.get(userId);
    const draft = userDrafts?.get(postId);

    if (!draft) {
      throw new BadRequestException('Draft not found');
    }

    if (draft.createdBy !== userId) {
      throw new ForbiddenException('Only creator can update draft');
    }

    const updated = await this.postService.createDraft({
      title: updates.title || draft.title,
      content: updates.content || draft.content,
      createdBy: userId,
      images: updates.images || draft.images,
      video: updates.video || draft.video,
      documents: updates.documents || draft.documents,
    });

    userDrafts.set(postId, updated);

    return updated;
  }

  async deleteDraft(postId: string, userId: string): Promise<void> {
    const userDrafts = this.userDrafts.get(userId);
    const draft = userDrafts?.get(postId);

    if (!draft) {
      throw new BadRequestException('Draft not found');
    }

    if (draft.createdBy !== userId) {
      throw new ForbiddenException('Only creator can delete draft');
    }

    userDrafts.delete(postId);
  }

  private validateAudienceScope(scope: string): void {
    if (VALID_AUDIENCE_SCOPES.includes(scope)) {
      return;
    }

    if (scope.startsWith('custom:') && scope.length > 7) {
      return;
    }

    throw new BadRequestException('Invalid audience scope');
  }
}
