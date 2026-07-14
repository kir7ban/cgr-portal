import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PostModule } from '../posts/post.module';
import { AuthModule } from '../auth/auth.module';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';

@Module({
  imports: [DatabaseModule, PostModule, AuthModule],
  providers: [ApprovalService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalModule {}
