import { Injectable, ForbiddenException } from '@nestjs/common';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class RevocationService {
  constructor(private postService: PostService, private databaseService: DatabaseService) {}
  async revokePost(postId: string, adminId: string, options: any = {}) {
    if (!this.isAdmin(adminId)) throw new ForbiddenException('Only Admins');
    return await this.postService.updatePostState(postId, 'REVOKED');
  }
  private isAdmin(u: string) { return ['bob.admin'].includes(u); }
}
