import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReactionService } from './reaction.service';
import { CommentService } from './comment.service';
import { ShareService } from './share.service';

@Module({
  imports: [DatabaseModule],
  providers: [ReactionService, CommentService, ShareService],
  exports: [ReactionService, CommentService, ShareService],
})
export class EngagementModule {}
