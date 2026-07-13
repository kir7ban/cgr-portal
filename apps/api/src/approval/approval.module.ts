import { Module } from '@nestjs/common';
import { PostModule } from '../posts/post.module';
import { DatabaseModule } from '../database/database.module';
import { ApprovalService } from './approval.service';

@Module({
  imports: [PostModule, DatabaseModule],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}
