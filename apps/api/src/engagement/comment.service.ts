import { Injectable, ForbiddenException } from '@nestjs/common';
@Injectable()
export class CommentService {
  async addComment(postId: string, userId: string, text: string) {
    return { id: `cmt-${Date.now()}`, text, userId };
  }
  async deleteComment(commentId: string, userId: string, isAdmin: boolean) {
    if (!isAdmin && userId !== 'owner') throw new ForbiddenException('Only author/admin');
    return { deleted: true };
  }
  async getComments(postId: string) { return { comments: [], total: 0 }; }
}
