import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReactionService } from './reaction.service';
import { CommentService } from './comment.service';
import { ShareService } from './share.service';
import { ReactionController } from './reaction.controller';
import { CommentController } from './comment.controller';
import { ShareController } from './share.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ReactionService, CommentService, ShareService],
  controllers: [ReactionController, CommentController, ShareController],
  exports: [ReactionService, CommentService, ShareService],
})
export class EngagementModule {}
