import { Injectable, ForbiddenException } from '@nestjs/common';
import { PostService } from '../posts/post.service';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class EditService {
  constructor(private postService: PostService, private databaseService: DatabaseService) {}
  async editPublishedPost(postId: string, userId: string, updates: any) {
    return await this.postService.updatePostState(postId, 'SUBMITTED');
  }
}
