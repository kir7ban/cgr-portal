import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class ShareService {
  constructor(private databaseService: DatabaseService) {}
  async sharePost(postId: string, userId: string, recipientIds: string[]) {
    return { shareId: `share-${postId}`, sharedWith: recipientIds.length };
  }
}
