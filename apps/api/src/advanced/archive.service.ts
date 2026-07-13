import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class ArchiveService {
  constructor(private databaseService: DatabaseService) {}
  async archiveOldPosts(olderThanDays: number = 365) {
    return { batchId: `arch-${Date.now()}`, archivedCount: 0 };
  }
}
