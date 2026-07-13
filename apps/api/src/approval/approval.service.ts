import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ApprovalService {
  private approvalQueue: Map<string, any> = new Map();
  private rejectedPosts: Set<string> = new Set();
  private pendingReviews: Map<string, any> = new Map();

  constructor(private postService: PostService, private databaseService: DatabaseService) {}

  async getApprovalQueue() { return Array.from(this.approvalQueue.values()); }
  
  async approve(postId: string, adminId: string, options: { finalAudience: string }) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins can approve');
    const updated = await this.postService.updatePostState(postId, 'PUBLISHED');
    await this.databaseService.insertAudit({
      id: `audit-approve-${postId}`,
      timestamp: new Date().toISOString(),
      actor: adminId,
      action: 'approve_post',
      resource: 'post',
      resourceId: postId,
    });
    return updated;
  }

  async reject(postId: string, adminId: string, options: { reason?: string }) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins can reject');
    const updated = await this.postService.updatePostState(postId, 'REJECTED');
    this.rejectedPosts.add(postId);
    return updated;
  }

  async requestFeedback(postId: string, adminId: string, options: { feedback?: string }) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins');
    return await this.postService.updatePostState(postId, 'DRAFT');
  }

  async override(postId: string, adminId: string, options: { finalAudience: string }) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins');
    return await this.postService.updatePostState(postId, 'PUBLISHED');
  }

  async markPendingReview(postId: string, adminId: string, options: { assignedTo: string }) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins');
    return await this.postService.updatePostState(postId, 'PENDING_REVIEW');
  }

  async addReviewComment(postId: string, adminId: string, options: { comment: string }) {
    return { by: adminId, text: options.comment, at: new Date().toISOString() };
  }

  private isAdmin(userId: string): boolean { return ['bob.admin'].includes(userId); }
}
