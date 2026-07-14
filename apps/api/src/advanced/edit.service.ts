import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostService, PostDocument } from '../posts/post.service';
import { DatabaseService, AuditEntry } from '../database/database.service';
import { ApprovalService, Submission } from '../approval/approval.service';

/**
 * Edit history entry tracking changes to a published post
 */
export interface RevisionHistory {
  id: string;
  postId: string;
  revisionNumber: number;
  editedBy: string;
  editedAt: string;
  previousContent: string;
  previousTitle: string;
  newTitle: string;
  newContent: string;
  changesSummary: string; // e.g., "Title updated, content revised"
  submissionId?: string; // The new submission created from this edit
}

/**
 * DTO for editing a published post
 */
export interface EditPublishedPostDto {
  title?: string;
  content?: string;
  images?: Array<{ url: string; size: number; type: string }>;
  video?: { url: string; source: 'youtube' | 'internal' };
  documents?: Array<{ url: string; name: string; size: number; type: string }>;
  changesSummary?: string; // Optional: brief description of what changed
}

@Injectable()
export class EditService {
  private revisionHistories: Map<string, RevisionHistory[]> = new Map();
  private revisionCount: Map<string, number> = new Map();

  constructor(
    private postService: PostService,
    private databaseService: DatabaseService,
    private approvalService: ApprovalService,
  ) {}

  /**
   * Edit a published post and trigger re-approval workflow
   * Only Comms Officers (post creators) can edit their own published posts
   * Edits create a new submission in the approval queue
   * Full revision history is recorded in audit trail
   *
   * @param postId - The post ID to edit
   * @param userId - The user requesting the edit (must be post creator)
   * @param dto - Updates to apply (title, content, media, etc.)
   * @returns Object with updated post, new submission ID, and revision entry
   */
  async editPublishedPost(
    postId: string,
    userId: string,
    dto: EditPublishedPostDto,
  ): Promise<{
    post: PostDocument;
    submission: Submission;
    revision: RevisionHistory;
  }> {
    // Retrieve the existing post
    const post = await this.postService.getPostForUser(postId, userId);
    if (!post) {
      throw new BadRequestException('Post not found or you do not have access');
    }

    // Verify post creator is the one editing
    if (post.createdBy !== userId) {
      throw new ForbiddenException('Only post creator can edit');
    }

    // Only PUBLISHED posts can be edited
    if (post.state !== 'PUBLISHED') {
      throw new BadRequestException('Only published posts can be edited. Draft posts use PATCH /api/posts/{id}');
    }

    // Validate new content before proceeding
    this.validateUpdates(dto);

    // Capture current state for revision history
    const revision: RevisionHistory = {
      id: `revision-${postId}-${Date.now()}`,
      postId,
      revisionNumber: (this.revisionCount.get(postId) || 0) + 1,
      editedBy: userId,
      editedAt: new Date().toISOString(),
      previousTitle: post.title,
      previousContent: post.content,
      newTitle: dto.title || post.title,
      newContent: dto.content || post.content,
      changesSummary: dto.changesSummary || this.generateChangesSummary(post, dto),
    };

    // Update post to SUBMITTED state with new content
    const updatedPost = await this.postService.updatePostState(postId, 'SUBMITTED');

    // Apply updates to post
    if (dto.title) updatedPost.title = dto.title;
    if (dto.content) updatedPost.content = dto.content;
    if (dto.images) updatedPost.images = dto.images;
    if (dto.video) updatedPost.video = dto.video;
    if (dto.documents) updatedPost.documents = dto.documents;

    // Create a new submission for re-approval
    const submission = await this.approvalService.createSubmission(
      postId,
      userId,
      post.proposedAudience,
    );

    // Store revision history
    if (!this.revisionHistories.has(postId)) {
      this.revisionHistories.set(postId, []);
    }
    revision.submissionId = submission.id;
    this.revisionHistories.get(postId)!.push(revision);
    this.revisionCount.set(postId, revision.revisionNumber);

    // Log comprehensive audit trail entry
    await this.databaseService.insertAudit({
      id: `audit-edit-${postId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: userId,
      action: 'edit_published_post',
      resource: 'post',
      resourceId: postId,
    });

    // Log the revision history entry in audit
    await this.databaseService.insertAudit({
      id: `audit-revision-${revision.id}`,
      timestamp: revision.editedAt,
      actor: userId,
      action: 'create_revision',
      resource: 'revision',
      resourceId: revision.id,
    });

    return {
      post: updatedPost,
      submission,
      revision,
    };
  }

  /**
   * Get full revision history for a post
   * @param postId - The post ID
   * @returns Array of revision entries in chronological order
   */
  async getRevisionHistory(postId: string): Promise<RevisionHistory[]> {
    // Verify post exists
    const post = await this.postService.getPostForUser(postId, '');
    if (!post) {
      throw new BadRequestException('Post not found');
    }

    return this.revisionHistories.get(postId) || [];
  }

  /**
   * Get a specific revision entry
   * @param revisionId - The revision ID
   * @returns Revision details
   */
  async getRevision(revisionId: string): Promise<RevisionHistory | undefined> {
    // Search through all revision histories
    for (const revisions of this.revisionHistories.values()) {
      const found = revisions.find((r) => r.id === revisionId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Get revision count for a post
   * @param postId - The post ID
   * @returns Number of revisions
   */
  async getRevisionCount(postId: string): Promise<number> {
    return this.revisionCount.get(postId) || 0;
  }

  /**
   * Generate a human-readable summary of changes
   * @private
   */
  private generateChangesSummary(post: PostDocument, dto: EditPublishedPostDto): string {
    const changes: string[] = [];

    if (dto.title && dto.title !== post.title) {
      changes.push('Title updated');
    }

    if (dto.content && dto.content !== post.content) {
      changes.push('Content revised');
    }

    if (dto.images && JSON.stringify(dto.images) !== JSON.stringify(post.images)) {
      changes.push('Images updated');
    }

    if (dto.video && JSON.stringify(dto.video) !== JSON.stringify(post.video)) {
      changes.push('Video updated');
    }

    if (dto.documents && JSON.stringify(dto.documents) !== JSON.stringify(post.documents)) {
      changes.push('Documents updated');
    }

    return changes.length > 0 ? changes.join(', ') : 'Post updated';
  }

  /**
   * Validate edit updates
   * @private
   */
  private validateUpdates(dto: EditPublishedPostDto): void {
    if (dto.content !== undefined && (!dto.content || dto.content.trim().length === 0)) {
      throw new BadRequestException('Content cannot be empty');
    }

    if (dto.title !== undefined && (!dto.title || dto.title.trim().length === 0)) {
      throw new BadRequestException('Title cannot be empty');
    }

    // Images validation
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    const MAX_IMAGES_PER_POST = 3;

    if (dto.images) {
      if (dto.images.length > MAX_IMAGES_PER_POST) {
        throw new BadRequestException('Maximum 3 images allowed per post');
      }

      for (const image of dto.images) {
        if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
          throw new BadRequestException('Invalid image type');
        }

        if (image.size > MAX_IMAGE_SIZE) {
          throw new BadRequestException('Image size cannot exceed 5MB');
        }
      }
    }

    // Video validation
    if (dto.video) {
      if (dto.video.source === 'direct') {
        throw new BadRequestException('Direct video uploads not allowed');
      }

      if (dto.video.source !== 'youtube' && dto.video.source !== 'internal') {
        throw new BadRequestException('Video source must be youtube or internal');
      }
    }

    // Documents validation
    const ALLOWED_DOCUMENT_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

    if (dto.documents) {
      for (const doc of dto.documents) {
        if (!ALLOWED_DOCUMENT_TYPES.includes(doc.type)) {
          throw new BadRequestException('Unsupported document type');
        }

        if (doc.size > MAX_DOCUMENT_SIZE) {
          throw new BadRequestException('Document size cannot exceed 10MB');
        }
      }
    }
  }
}
